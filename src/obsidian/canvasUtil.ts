import { CanvasNode } from './canvas-internal'

export type HasId = {
	id: string
}

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
export async function visitNodeAndAncestors<Node extends HasId>(
	start: Node,
	visitor: (node: Node, depth: number) => Promise<boolean>,
	getNodeParents: (node: Node) => Node[],
	maxDepth = Infinity
) {
	const visited = new Set<string>()
	const queue: { node: Node; depth: number }[] = [{ node: start, depth: 0 }]

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

		if (depth >= maxDepth) continue

		const parents = getNodeParents(currentNode)
		for (const parent of parents) {
			if (!visited.has(parent.id)) {
				queue.push({ node: parent, depth: depth + 1 })
			}
		}
	}
}
