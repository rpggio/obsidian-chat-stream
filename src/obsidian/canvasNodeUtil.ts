import { App, ItemView } from 'obsidian'
import { CanvasView } from './canvas-patches'
import { CanvasNode } from './canvas-internal'

export type HasId = {
	id: string
}

export type NodeVisitor = (node: HasId, depth: number) => Promise<boolean>

/**
 * Get parents for canvas note
 */
export function getNoteParents(note: CanvasNode) {
	const canvas = note.canvas
	const parents = canvas
		.getEdgesForNode(note)
		.filter((edge) => edge.to.node.id === note.id)
		.map((edge) => edge.from.node)
	// Order left-to-right
	parents.sort((a, b) => b.x - a.x)
	return parents
}

/**
 * Get children for canvas note
 */
export function getNoteChildren(note: CanvasNode) {
	const canvas = note.canvas
	const children = canvas
		.getEdgesForNode(note)
		.filter((edge) => edge.from.node.id === note.id)
		.map((edge) => edge.to.node)
	// Order left-to-right
	children.sort((a, b) => a.x - b.x)
	return children
}

/**
 * Get eddges pointing to note
 */
export function inboundEdges(note: CanvasNode) {
	const canvas = note.canvas
	return canvas
		.getEdgesForNode(note)
		.filter((edge) => edge.to.node.id === note.id)
}

/**
 * Visit node and ancestors breadth-first
 */
export async function visitNoteAndAncestors(
	start: { id: string },
	visitor: NodeVisitor,
	getParents: (node: HasId) => HasId[] = getNoteParents
) {
	const visited = new Set<string>()
	const queue: { node: HasId; depth: number }[] = [{ node: start, depth: 0 }]

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
