import { CanvasNode } from 'src/obsidian/canvas-internal'

export function nodeParents(node: CanvasNode) {
	const canvas = node.canvas
	return canvas
		.getEdgesForNode(node)
		.filter((edge) => edge.to.node.id === node.id)
		.map((edge) => edge.from.node)
}

/**
 * Signature for node visitor
 * @depth Current depth: zero means starting node
 * @returns `true` if visiting should continue
 */
export type NodeVisitor = (
	node: CanvasNode,
	depth: number
) => boolean | Promise<boolean>

/**
 * Visit node and ancestors, breadth-first. Nodes are not visited twice.
 * Stops when visitor returns `false`
 * @returns Last visited node
 */
export async function visitNodeAndAncestors(
	start: CanvasNode,
	visitor: NodeVisitor
) {
	let shouldContinue = true
	const visited = new Set<string>()
	let lastVisited: CanvasNode | null = null

	const visit = async (node: CanvasNode, depth: number) => {
		if (!shouldContinue) return
		if (visited.has(node.id)) return
		visited.add(node.id)
		lastVisited = node

		try {
			shouldContinue = await visitor(node, depth)
		} catch (error) {
			console.error(error)
			shouldContinue = false
		}

		if (shouldContinue) {
			const parents = nodeParents(node)
			for (const parent of parents) {
				if (shouldContinue) await visit(parent, depth + 1)
			}
		}
	}

	await visit(start, 0)

	return lastVisited
}
