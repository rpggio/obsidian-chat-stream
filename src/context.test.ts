import { readFileSync } from 'node:fs'
import type { CanvasEdge, CanvasNode } from './obsidian/canvas-internal'
import { buildContext } from './context'

const fixture = JSON.parse(readFileSync('test-vault/Weekend plan.canvas', 'utf8')) as {
	nodes: { id: string; type: string; x: number; text?: string; file?: string; chat_role?: string }[]
	edges: { fromNode: string; toNode: string }[]
}

function makeNode(id: string): CanvasNode {
	const data = fixture.nodes.find(node => node.id === id)!
	const edges = fixture.edges.filter(edge => edge.toNode === id)
	return {
		id,
		x: data.x,
		getData: () => data,
		canvas: {
			getEdgesForNode: () => edges.map(edge => ({
				from: { node: makeNode(edge.fromNode) },
				to: { node: { id } }
			})) as CanvasEdge[]
		}
	} as unknown as CanvasNode
}

const read = async (node: CanvasNode) => {
	const data = node.getData()
	if (data.type === 'text') return data.text
	if (data.type === 'file') return readFileSync(`test-vault/${data.file}`, 'utf8')
}

const settings = { maxDepth: 0, maxInputTokens: 0, systemPrompt: 'Be brief.' }

test('the linked note follows its branch and the assistant role survives reload', async () => {
	const left = await buildContext(makeNode('3333333333333333'), settings, read)
	expect(left.map(message => message.role)).toEqual(['system', 'user', 'user', 'user'])
	expect(left[2].content).toContain('Cedar Loop')
	const right = await buildContext(makeNode('5555555555555555'), settings, read)
	expect(right.map(message => message.role)).toEqual(['system', 'user', 'user', 'assistant'])
	expect(JSON.stringify(right)).not.toContain('Cedar Loop')
})

test('depth limits the ancestors read', async () => {
	const readNode = jest.fn(read)
	const messages = await buildContext(makeNode('3333333333333333'), { ...settings, maxDepth: 1 }, readNode)
	expect(readNode).toHaveBeenCalledTimes(2)
	expect(messages).toHaveLength(3)
})
