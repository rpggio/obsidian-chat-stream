import { App, ItemView, Notice, TFile } from 'obsidian'
import { Canvas, CanvasNode } from './obsidian/canvas-internal'
import { CanvasView, calcHeight, createNode } from './obsidian/canvas-patches'
import { getChatGPTCompletion } from './openai/chatGPT'
import { openai } from './openai/chatGPT-types'
import {
	ChatStreamSettings,
	DEFAULT_SETTINGS,
	DEFAULT_SYSTEM_PROMPT
} from './settings/ChatStreamSettings'

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

export class AINodeBuilder {
	app: App
	settings: ChatStreamSettings
	logDebug: (...args: unknown[]) => void = () => {}
	unloaded = false

	constructor(app: App, settings: ChatStreamSettings) {
		this.app = app
		this.settings = settings
	}

	canCallAI() {
		if (!this.settings.apiKey) {
			new Notice('Please set your OpenAI API key in the plugin settings')
			return false
		}

		return true
	}

	async getNodeText(node: CanvasNode) {
		const nodeData = node.getData()
		switch (nodeData.type) {
			case 'text':
				return nodeData.text
			case 'file':
				return this.readFile(nodeData.file)
		}
	}

	async readFile(path: string) {
		const file = this.app.vault.getAbstractFileByPath(path)
		if (file instanceof TFile) {
			const body = await app.vault.read(file)
			return `## ${file.basename}\n${body}`
		}
	}

	async nextNote() {
		if (this.unloaded) return

		this.logDebug('Creating user note')

		const canvas = this.getActiveCanvas()
		if (!canvas) {
			this.logDebug('No active canvas')
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

	getActiveCanvas() {
		const maybeCanvasView = app.workspace.getActiveViewOfType(
			ItemView
		) as CanvasView | null
		return maybeCanvasView ? maybeCanvasView['canvas'] : null
	}

	async buildMessages(
		node: CanvasNode,
		canvas: Canvas,
		settings: ChatStreamSettings,
		logDebug: (...args: unknown[]) => void
	) {
		const messages: openai.ChatCompletionRequestMessage[] = []

		let totalLength = 0

		const visit = async (node: CanvasNode, depth: number) => {
			if (settings.maxDepth && depth > settings.maxDepth) return

			// TODO: calculate max input chars by model type

			const nodeData = node.getData()
			let nodeText = (await this.getNodeText(node)) || ''
			const lengthLimit =
				settings.maxInputCharacters || DEFAULT_SETTINGS.maxInputCharacters

			const parents = canvas
				.getEdgesForNode(node)
				.filter((edge) => edge.to.node.id === node.id)
				.map((edge) => edge.from.node)

			if (nodeText.trim()) {
				let textLength = nodeText.length
				if (totalLength + textLength > lengthLimit) {
					const truncatedLength = lengthLimit - totalLength
					logDebug(
						`Truncating node text from ${nodeText.length} to ${truncatedLength} characters`
					)

					// truncate beginning of text
					nodeText = nodeText.slice(nodeText.length - truncatedLength)
					textLength = truncatedLength
				}
				totalLength += textLength

				let role: openai.ChatCompletionRequestMessageRoleEnum =
					nodeData.chat_role === 'assistant' ? 'assistant' : 'user'
				if (parents.length === 0 && nodeText.startsWith('SYSTEM PROMPT')) {
					nodeText = nodeText.slice('SYSTEM PROMPT'.length).trim()
					role = 'system'
				}

				messages.unshift({
					content: nodeText,
					role
				})
			}

			if (totalLength >= lengthLimit) {
				return
			}

			for (const parent of parents) {
				await visit(parent, depth + 1)
			}
		}

		// Visit node and ancestors
		await visit(node, 0)

		if (!messages.length) return []

		if (messages[0].role !== 'system') {
			messages.unshift({
				content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
				role: 'system'
			})
		}

		return messages
	}

	async generateNote() {
		if (this.unloaded) return

		if (!this.canCallAI()) return

		this.logDebug('Creating AI note')

		const canvas = this.getActiveCanvas()
		if (!canvas) {
			this.logDebug('No active canvas')
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

			const settings = this.settings
			const messages = await this.buildMessages(
				node,
				canvas,
				settings,
				this.logDebug
			)
			if (!messages.length) return

			this.logDebug('Messages for chat API', messages)

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

			new Notice(`Sending ${messages.length} notes to GPT`)

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
}
