import { Tiktoken } from 'js-tiktoken/lite'
import ranks from 'js-tiktoken/ranks/o200k_base'
import type { ChatMessage } from './ai/chat'
import type { CanvasNode } from './obsidian/canvas-internal'
import { nodeParents, visitNodeAndAncestors } from './obsidian/canvasUtil'
import type { ChatStreamSettings } from './settings/ChatStreamSettings'

let tokenizer: Tiktoken | undefined
const defaultInputBudget = 16_000
const systemMarker = /^SYSTEM PROMPT(?:\s|$)/

export async function buildContext(
	selected: CanvasNode,
	settings: Pick<ChatStreamSettings, 'maxDepth' | 'maxInputTokens' | 'systemPrompt'>,
	readNode: (node: CanvasNode) => Promise<string | undefined>
): Promise<ChatMessage[]> {
	const inputs: { role: ChatMessage['role']; text: string }[] = []
	let systemPrompt: string | undefined
	await visitNodeAndAncestors(selected, async node => {
		const text = (await readNode(node))?.trim()
		if (!text) return true
		if (systemMarker.test(text)) {
			systemPrompt ??= text.replace(systemMarker, '').trim()
		} else {
			inputs.push({ role: node.getData().chat_role === 'assistant' ? 'assistant' : 'user', text })
		}
		return true
	}, nodeParents, settings.maxDepth || Infinity)

	const encoding = tokenizer ??= new Tiktoken(ranks)
	let remaining = settings.maxInputTokens || defaultInputBudget
	const encode = (text: string) => encoding.encode(text, [], [])
	const prompt = systemPrompt ?? settings.systemPrompt
	if (prompt) remaining -= encode(prompt).length
	if (remaining <= 0) throw new Error('The system prompt uses the full input budget. Shorten it or increase the limit.')

	const messages: ChatMessage[] = []
	for (const { role, text } of inputs) {
		if (remaining <= 0) break
		if (text.startsWith('data:image/')) {
			messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: text } }] })
			continue
		}
		const tokens = encode(text)
		const content = tokens.length <= remaining ? text : encoding.decode(tokens.slice(0, remaining))
		if (content) messages.push({ role, content })
		remaining -= tokens.length
	}
	messages.reverse()
	if (messages.length && prompt) messages.unshift({ role: 'system', content: prompt })
	return messages
}
