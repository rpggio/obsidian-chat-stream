import { TiktokenModel, encodingForModel } from 'js-tiktoken'
import { Notice } from 'obsidian'
import {
	CHAT_MODELS,
	chatModelByName,
	getChatGPTCompletion
} from './openai/chatGPT'
import { openai } from './openai/chatGPT-types'
import {
	ChatStreamSettings,
	DEFAULT_SETTINGS
} from './settings/ChatStreamSettings'
import { ChatStreamNodeData, ModuleContext } from './types'
import { Canvas, CanvasNode, CanvasNodeData, calcHeight, createNode, getActiveCanvas, getNodeParents, readNoteContent, visitNoteAndAncestors } from './obsidian'

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
	context: ModuleContext
) {
	const { app, settings, logDebug } = context

	const canCallAI = () => {
		if (!settings.apiKey) {
			new Notice('Please set your OpenAI API key in the plugin settings')
			return false
		}

		return true
	}

	const nextNote = async (text: string = '') => {
		logDebug('Creating user note')

		const canvas = getActiveCanvas(app)
		if (!canvas) {
			logDebug('No active canvas')
			return
		}

		await canvas.requestFrame()

		const selection = canvas.getSelectionData().nodes
		if (selection?.length !== 1) return
		const node = selection[0]

		if (node) {
			const height = text
				? calcHeight({
					text,
					parentHeight: emptyNoteHeight
				})
				: emptyNoteHeight

			const created = createNode(canvas, node, {
				text,
				size: { height }
			})
			if (!created) return

			const shouldStartEditing = !text

			canvas.selectOnly(created, shouldStartEditing)
			await canvas.requestSave()

			if (shouldStartEditing) {
				// startEditing() doesn't work if called immediately
				await sleep(100)
				created.startEditing()
			}
			return true
		}
	}

	const isSystemPromptNode = (text: string) =>
		text.trim().startsWith('SYSTEM PROMPT')

	const getSystemPrompt = async (nodeData: CanvasNodeData) => {
		const canvas = getActiveCanvas(app)
		if (!canvas) return null

		const node = canvas.nodes.get(nodeData.id)
		if (!node) return null

		let foundPrompt: string | null = null

		await visitNoteAndAncestors(node, async (n: CanvasNode) => {
			const text = await readNoteContent(n)
			if (text && isSystemPromptNode(text)) {
				foundPrompt = text
				return false
			} else {
				return true
			}
		},
			getNodeParents
		)

		return foundPrompt || settings.systemPrompt
	}

	const buildMessages = async (canvas: Canvas, nodeData: CanvasNodeData) => {
		const node = canvas.nodes.get(nodeData.id)
		if (!node) throw new Error('Node not found')

		const encoding = encodingForModel(
			(settings.apiModel || DEFAULT_SETTINGS.apiModel) as TiktokenModel
		)

		const messages: openai.ChatCompletionRequestMessage[] = []
		let tokenCount = 0

		// Note: We are not checking for system prompt longer than context window.
		// That scenario makes no sense, though.
		const systemPrompt = await getSystemPrompt(node)
		if (systemPrompt) {
			tokenCount += encoding.encode(systemPrompt).length
		}

		const visit = async (node: CanvasNode, depth: number) => {
			if (settings.maxDepth && depth > settings.maxDepth) return false

			const nodeData = node.getData()
			let nodeText = (await readNoteContent(node))?.trim() || ''
			const inputLimit = getTokenLimit(settings)

			let shouldContinue = true

			if (nodeText) {
				if (isSystemPromptNode(nodeText)) return true

				let nodeTokens = encoding.encode(nodeText)
				let keptNodeTokens: number

				if (tokenCount + nodeTokens.length > inputLimit) {
					// will exceed input limit

					shouldContinue = false

					// Leaving one token margin, just in case
					const keepTokens = nodeTokens.slice(0, inputLimit - tokenCount - 1)
					const truncateTextTo = encoding.decode(keepTokens).length
					logDebug(
						`Truncating node text from ${nodeText.length} to ${truncateTextTo} characters`
					)
					nodeText = nodeText.slice(0, truncateTextTo)
					keptNodeTokens = keepTokens.length
				} else {
					keptNodeTokens = nodeTokens.length
				}

				tokenCount += keptNodeTokens

				const role: openai.ChatCompletionRequestMessageRoleEnum =
					(nodeData as CanvasNodeData as ChatStreamNodeData).chat_role === 'assistant' ? 'assistant' : 'user'

				messages.unshift({
					content: nodeText,
					role
				})
			}

			return shouldContinue
		}

		await visitNoteAndAncestors<CanvasNode>(node, visit, getNodeParents)

		if (messages.length) {
			if (systemPrompt) {
				messages.unshift({
					content: systemPrompt,
					role: 'system'
				})
			}

			return { messages, tokenCount }
		} else {
			return { messages: [], tokenCount: 0 }
		}
	}

	const generateNote: () => Promise<boolean> = async () => {
		if (!canCallAI()) return false

		logDebug('Creating AI note')

		const canvas = getActiveCanvas(app)
		if (!canvas) {
			logDebug('No active canvas')
			return false
		}

		await canvas.requestFrame()

		const selection = canvas.getSelectionData().nodes
		if (selection?.length !== 1) return false
		const values = Array.from(selection.values())
		const node = values[0]

		if (node) {
			// Last typed characters might not be applied to note yet
			await canvas.requestSave()
			await sleep(200)

			const { messages, tokenCount } = await buildMessages(canvas, node)
			if (!messages.length) return false

			const created = createNode(
				canvas,
				node,
				{
					text: `Calling AI (${settings.apiModel})...`,
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
				logDebug('messages', messages)

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
					return true
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

				const selection = canvas.getSelectionData().nodes
				const selectedNoteId = selection.length === 1 ? selection[0].id : undefined

				if (selectedNoteId === node?.id || selectedNoteId == null) {
					// If the user has not changed selection, select the created node
					canvas.selectOnly(created, false /* startEditing */)
				}
			} catch (error) {
				new Notice(`Error calling GPT: ${error.message || error}`)
				canvas.removeNode(created)
			}

			await canvas.requestSave()
			return true
		}

		return false
	}

	return { nextNote, generateNote }
}

function getTokenLimit(settings: ChatStreamSettings) {
	const model = chatModelByName(settings.apiModel) || CHAT_MODELS.GPT_35_TURBO_0125
	return settings.maxInputTokens
		? Math.min(settings.maxInputTokens, model.tokenLimit)
		: model.tokenLimit
}
