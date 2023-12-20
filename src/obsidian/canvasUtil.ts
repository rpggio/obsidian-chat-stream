import { CanvasNode } from 'src/obsidian/canvas-internal'

export type HasId = {
	id: string
}

export type NodeVisitor = (node: HasId, depth: number) => Promise<boolean>

/**
 * Get parents for canvas node
 */
export function nodeParents(node: CanvasNode) {
	const canvas = node.canvas
	const nodes = canvas
		.getEdgesForNode(node)
		.filter((edge) => edge.to.node.id === node.id)
		.map((edge) => edge.from.node)
	// Left-to-right for node ordering
	nodes.sort((a, b) => b.x - a.x)
	return nodes
}

/**
 * Visit node and ancestors breadth-first
 */
export async function visitNodeAndAncestors(
	start: { id: string },
	visitor: NodeVisitor,
	getNodeParents: (node: HasId) => HasId[] = nodeParents
) {
	const visited = new Set<string>()
	const queue: { node: HasId; depth: number }[] = [{ node: start, depth: 0 }]

	while (queue.length > 0) {
		const { node: currentNode, depth } = queue.shift()!
		if (visited.has(currentNode.id)) {
			continue
		}

		const shouldContinue = await visitor(currentNode, depth)
		if (!shouldContinue) {
			break
		}

		visited.add(currentNode.id)

		const parents = getNodeParents(currentNode)
		for (const parent of parents) {
			if (!visited.has(parent.id)) {
				queue.push({ node: parent, depth: depth + 1 })
			}
		}
	}
}
