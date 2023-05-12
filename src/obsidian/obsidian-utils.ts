import { Canvas } from './canvas-internal'

interface CanvasEdge {
	fromOrTo: string
	side: string,
	node: any,
}

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

// export async function trapErrorAsync<T>(fn: () => Promise<T>) {
// 	try {
// 		return () => fn()
// 	} catch (e) {
// 		console.error(e)
// 	}
// }

export function trapError<T>(fn: (...params: any[]) => T) {
	return (...params: any[]) => {
		try {
			return fn(...params)
		} catch (e) {
			console.error(e)
		}
	}
}
