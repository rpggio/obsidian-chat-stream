import { App, ItemView, Modal, Notice } from 'obsidian'
import { completeChat, getConnection } from './ai/chat'
import { endpointFor } from './ai/connection'
import { buildContext } from './context'
import type { Canvas } from './obsidian/canvas-internal'
import { CanvasView, calcHeight, createNode } from './obsidian/canvas-patches'
import { readNodeContent } from './obsidian/fileUtil'
import type { ChatStreamSettings } from './settings/ChatStreamSettings'
import type { Logger } from './util/logging'

export function noteGenerator(app: App, settings: ChatStreamSettings, logDebug: Logger) {
	const running = new WeakSet<Canvas>()

	function getSelection() {
		const view = app.workspace.getActiveViewOfType(ItemView)
		const canvas = view?.getViewType() === 'canvas' ? (view as CanvasView).canvas : undefined
		if (canvas?.selection.size !== 1) {
			new Notice('Select one card in an Obsidian Canvas.')
			return
		}
		const node = [...canvas.selection][0]
		return { canvas, node }
	}

	async function nextNote() {
		const selected = getSelection()
		if (!selected) return
		const { canvas, node } = selected
		const created = await createNode(canvas, node, { text: '', size: { height: 100 } })
		canvas.selectOnly(created, true)
		await canvas.requestSave()
		// The Canvas editor mounts on a later render after inserting the card.
		await sleep(100)
		if (canvas.selection.has(created) && !created.isEditing) created.startEditing()
	}

	async function generateNote() {
		const selected = getSelection()
		if (!selected) return
		const { canvas, node } = selected
		if (running.has(canvas)) {
			new Notice('Chat Stream is already generating a reply for this canvas.')
			return
		}
		running.add(canvas)
		try {
			const options = { ...settings }
			const connection = getConnection(app, options)
			const messages = await buildContext(node, options, readNodeContent)
			if (!messages.length) {
				new Notice('The selected branch has no readable chat context.')
				return
			}
			new Notice(`Generating a reply using ${connection.destination}…`)
			logDebug('Generating reply', { messageCount: messages.length })
			const response = await completeChat(connection, messages, {
				maxResponseTokens: options.maxResponseTokens,
				temperature: options.temperature ?? undefined
			})
			const activeView = app.workspace.getActiveViewOfType(ItemView) as CanvasView | null
			if (!app.workspace.getLeavesOfType('canvas').some(leaf => (leaf.view as CanvasView).canvas === canvas)
				|| !canvas.getData().nodes.some(current => current.id === node.id)) {
				new Notice('The original Canvas card is unavailable. The reply was discarded.')
				return
			}
			const shouldSelect = activeView?.canvas === canvas && canvas.selection.has(node)
			const created = await createNode(canvas, node, {
				text: response,
				size: { height: calcHeight({ text: response, parentHeight: node.height }) }
			}, { color: '6', chat_role: 'assistant' }, shouldSelect)
			if (shouldSelect) canvas.selectOnly(created, false)
			await canvas.requestSave()
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Chat Stream could not generate a reply.')
		} finally {
			running.delete(canvas)
		}
	}

	async function previewContext() {
		const selected = getSelection()
		if (!selected) return
		const options = { ...settings }
		try {
			const messages = await buildContext(selected.node, options, readNodeContent)
			const destination = CHAT_STREAM_DEV && options.provider === 'demo' ? 'Offline demo (on this device)' : endpointFor(options).host
			const modal = new Modal(app)
			modal.setTitle('Chat Stream context')
			modal.contentEl.createEl('p', { text: `Destination: ${destination}. Preview sends no request.` })
			modal.contentEl.createEl('pre', {
				cls: 'chat-stream-context',
				text: messages.map(message => `${message.role.toUpperCase()}\n${
					typeof message.content === 'string' ? message.content : '[Image attachment]'
				}`).join('\n\n') || 'No readable context.'
			})
			modal.open()
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Chat Stream could not preview the context.')
		}
	}

	return { nextNote, generateNote, previewContext }
}
