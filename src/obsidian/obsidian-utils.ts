import { ItemView } from 'obsidian'
import { Canvas } from './canvas-internal'

interface CanvasEdge {
	fromOrTo: string
	side: string,
	node: CanvasElement,
}

interface CanvasElement {
	id: string
}

export type CanvasView = ItemView & { 
	canvas: Canvas
}

/**
 * Add edge entry to canvas.
 */
export const addEdge = (canvas: Canvas, edgeID: string, fromEdge: CanvasEdge, toEdge: CanvasEdge) => {
	if (!canvas) return

	const data = canvas.getData()

	if (!data) return

	canvas.importData({
		"edges": [
			...data.edges,
			{ "id": edgeID, "fromNode": fromEdge.node.id, "fromSide": fromEdge.side, "toNode": toEdge.node.id, "toSide": toEdge.side }
		],
		"nodes": data.nodes,
	})

	canvas.requestFrame()
}

/**
 * Trap exception and write to console.error.
 */
export function trapError<T>(fn: (...params: unknown[]) => T) {
	return (...params: unknown[]) => {
		try {
			return fn(...params)
		} catch (e) {
			console.error(e)
		}
	}
}
