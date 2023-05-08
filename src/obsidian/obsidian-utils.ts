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
