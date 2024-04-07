import { Canvas, CanvasNode } from './canvas-internal'

export type HasId = {
	id: string
}

export type NodeVisitor<T extends HasId> = (node: T, depth: number) => Promise<boolean>

/**
 * Get parents for canvas note
 */
export function getNodeParents(node: CanvasNode) {
	const parents = node.canvas
		.getEdgesForNode(node)
		.filter((edge) => edge.to.node.id === node.id)
		.map((edge) => edge.from.node)
	// Order left-to-right
	parents.sort((a, b) => b.x - a.x)
	return parents
}

/**
 * Get children for canvas note
 */
export function getNodeChildren(node: CanvasNode) {
	const children = node.canvas
		.getEdgesForNode(node)
		.filter((edge) => edge.from.node.id === node.id)
		.map((edge) => edge.to.node)
	// Order left-to-right
	children.sort((a, b) => a.x - b.x)
	return children
}

/**
 * Get eddges pointing to note
 */
export function inboundEdges(canvas: Canvas, note: CanvasNode) {
	return canvas
		.getEdgesForNode(note)
		.filter((edge) => edge.to.node.id === note.id)
}

/**
 * Visit node and ancestors breadth-first
 */
export async function visitNoteAndAncestors<TNode extends HasId>(
	start: TNode,
	visitor: NodeVisitor<TNode>,
	getParents: (node: TNode) => TNode[]
) {
	const visited = new Set<string>()
	const queue: { node: TNode; depth: number }[] = [{ node: start, depth: 0 }]

	while (queue.length > 0) {
		const { node: currentNote, depth } = queue.shift()!
		if (visited.has(currentNote.id)) {
			continue
		}

		const shouldContinue = await visitor(currentNote, depth)
		if (!shouldContinue) {
			break
		}

		visited.add(currentNote.id)

		const parents = getParents(currentNote)
		for (const parent of parents) {
			if (!visited.has(parent.id)) {
				queue.push({ node: parent, depth: depth + 1 })
			}
		}
	}
}
