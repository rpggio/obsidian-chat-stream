import { TiktokenModel, encodingForModel } from 'js-tiktoken'
import { App, ItemView, Notice, TFile } from 'obsidian'
import { Canvas, CanvasNode } from './obsidian/canvas-internal'
import { CanvasView, calcHeight, createNode } from './obsidian/canvas-patches'
import {
	CHAT_MODELS,
	chatModelByName,
	getChatGPTCompletion
} from './openai/chatGPT'
import { openai } from './openai/chatGPT-types'
import {
	ChatStreamSettings,
	DEFAULT_SETTINGS,
	DEFAULT_SYSTEM_PROMPT
} from './settings/ChatStreamSettings'
import { Logger } from './util/logging'

/**
 * Color for assistant notes: 6 == purple
 */
const assistantColor = '6'

/**
 * Height to use for placeholder note
 */
const placeholderNoteHeight = 60

/**
 * Height to use for new empty note
 */
const emptyNoteHeight = 100

export function noteGenerator(
	app: App,
	settings: ChatStreamSettings,
	logDebug: Logger = () => {}
) {
	const canCallAI = () => {
		if (!settings.apiKey) {
			new Notice('Please set your OpenAI API key in the plugin settings')
			return false
		}

		return true
	}

	const getNodeText = (node: CanvasNode) => {
		const nodeData = node.getData()
		switch (nodeData.type) {
			case 'text':
				return nodeData.text
			case 'file':
				return readFile(nodeData.file)
		}
	}

	const readFile = async (path: string) => {
		const file = app.vault.getAbstractFileByPath(path)
		if (file instanceof TFile) {
			const body = await app.vault.read(file)
			return `## ${file.basename}\n${body}`
		} else {
			logDebug('Cannot read from file', file)
		}
	}

	const nextNote = async () => {
		logDebug('Creating user note')

		const canvas = getActiveCanvas()
		if (!canvas) {
			logDebug('No active canvas')
			return
		}

		await canvas.requestFrame()

		const selection = canvas.selection
		if (selection?.size !== 1) return
		const values = Array.from(selection.values()) as CanvasNode[]
		const node = values[0]

		if (node) {
			const created = createNode(canvas, node, {
				text: '',
				size: { height: emptyNoteHeight }
			})
			canvas.selectOnly(created, true /* startEditing */)

			// startEditing() doesn't work if called immediately
			await canvas.requestSave()
			await sleep(0)

			created.startEditing()
		}
	}

	const getActiveCanvas = () => {
		const maybeCanvasView = app.workspace.getActiveViewOfType(
			ItemView
		) as CanvasView | null
		return maybeCanvasView ? maybeCanvasView['canvas'] : null
	}

	const buildMessages = async (node: CanvasNode, canvas: Canvas) => {
		const encoding = encodingForModel(
			(settings.apiModel || DEFAULT_SETTINGS.apiModel) as TiktokenModel
		)

		const messages: openai.ChatCompletionRequestMessage[] = []

		let tokenCount = 0
		let done = false

		const visit = async (node: CanvasNode, depth: number) => {
			if (settings.maxDepth && depth > settings.maxDepth) return

			const nodeData = node.getData()
			let nodeText = (await getNodeText(node)) || ''
			const inputLimit = getTokenLimit(settings)

			const parents = canvas
				.getEdgesForNode(node)
				.filter((edge) => edge.to.node.id === node.id)
				.map((edge) => edge.from.node)

			if (nodeText.trim()) {
				// Handle in-canvas system prompt
				let role: openai.ChatCompletionRequestMessageRoleEnum =
					nodeData.chat_role === 'assistant' ? 'assistant' : 'user'
				if (parents.length === 0 && nodeText.startsWith('SYSTEM PROMPT')) {
					nodeText = nodeText.slice('SYSTEM PROMPT'.length).trim()
					role = 'system'
				}

				let nodeTokenCount = encoding.encode(nodeText).length

				if (tokenCount + nodeTokenCount > inputLimit) {
					done = true
					const truncateTo = approximateTextLengthForTokens(
						inputLimit - tokenCount
					)
					logDebug(
						`Truncating node text from ${nodeText.length} to ${truncateTo} characters`
					)

					// truncate beginning of text
					nodeText = nodeText.slice(nodeText.length - truncateTo)
					nodeTokenCount = encoding.encode(nodeText).length
				}

				tokenCount += nodeTokenCount

				messages.unshift({
					content: nodeText,
					role
				})
			}

			if (done) {
				return
			}

			for (const parent of parents) {
				await visit(parent, depth + 1)
			}
		}

		// Visit node and ancestors
		await visit(node, 0)

		if (!messages.length) return { messages: [], tokenCount: 0 }

		if (messages[0].role !== 'system') {
			messages.unshift({
				content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
				role: 'system'
			})
		}

		return { messages, tokenCount }
	}

	const generateNote = async () => {
		if (!canCallAI()) return

		logDebug('Creating AI note')

		const canvas = getActiveCanvas()
		if (!canvas) {
			logDebug('No active canvas')
			return
		}

		await canvas.requestFrame()

		const selection = canvas.selection
		if (selection?.size !== 1) return
		const values = Array.from(selection.values())
		const node = values[0]

		if (node) {
			// Last typed characters might not be applied to note yet
			await canvas.requestSave()
			await sleep(200)

			const { messages, tokenCount } = await buildMessages(node, canvas)
			if (!messages.length) return

			logDebug('Messages for chat API', messages)

			const created = createNode(
				canvas,
				node,
				{
					text: `Calling GPT (${settings.apiModel})...`,
					size: { height: placeholderNoteHeight }
				},
				{
					color: assistantColor,
					chat_role: 'assistant'
				}
			)

			new Notice(
				`Sending ${messages.length} notes with ${tokenCount} tokens to GPT`
			)

			try {
				const generated = await getChatGPTCompletion(
					settings.apiKey,
					settings.apiUrl,
					settings.apiModel,
					messages,
					{
						max_tokens: settings.maxResponseTokens || undefined,
						temperature: settings.temperature
					}
				)

				if (generated == null) {
					new Notice(`Empty or unreadable response from GPT`)
					canvas.removeNode(created)
					return
				}

				created.setText(generated)
				const height = calcHeight({
					text: generated,
					parentHeight: node.height
				})
				created.moveAndResize({
					height,
					width: created.width,
					x: created.x,
					y: created.y
				})

				const selectedNoteId =
					canvas.selection?.size === 1
						? Array.from(canvas.selection.values())?.[0]?.id
						: undefined

				if (selectedNoteId === node?.id || selectedNoteId == null) {
					// If the user has not changed selection, select the created node
					canvas.selectOnly(created, false /* startEditing */)
				}
			} catch (error) {
				new Notice(`Error calling GPT: ${error.message || error}`)
				canvas.removeNode(created)
			}

			await canvas.requestSave()
		}
	}

	return { nextNote, generateNote }
}

function approximateTextLengthForTokens(tokenCount: number) {
	return tokenCount * 3
}

function getTokenLimit(settings: ChatStreamSettings) {
	const model = chatModelByName(settings.apiModel) || CHAT_MODELS.GPT35
	return settings.maxInputTokens
		? Math.min(settings.maxInputTokens, model.tokenLimit)
		: model.tokenLimit
}
