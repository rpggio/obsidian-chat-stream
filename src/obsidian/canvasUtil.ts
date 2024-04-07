import { AllCanvasNodeData, CanvasEdgeData, CanvasNodeData, NodeSide } from './canvas'
import { randomHexString } from '../utils'
import { Canvas } from './canvas-internal'
import { ChatStreamNodeData } from 'src/types'

export type EdgeAttachemnt = {
	nodeId: string
	side: NodeSide
}

/**
 * Minimum width for new notes
 */
const minWidth = 360

/**
 * Assumed pixel width per character
 */
const pxPerChar = 5

/**
 * Assumed pixel height per line
 */
const pxPerLine = 28

/**
 * Assumed height of top + bottom text area padding
 */
const textPaddingHeight = 12

/**
 * Margin between new notes
 */
const newNoteMargin = 60

/**
 * Min height of new notes
 */
const minHeight = 60

/**
 * Choose height for generated note based on text length and parent height.
 * For notes beyond a few lines, the note will have scroll bar.
 * Not a precise science, just something that is not surprising.
 */
export const calcHeight = (options: { parentHeight: number; text: string | undefined }) => {
	const calcTextHeight = Math.round(
		textPaddingHeight +
		(pxPerLine * (options.text?.length || 0)) / (minWidth / pxPerChar)
	)
	return Math.max(options.parentHeight, calcTextHeight)
}

/**
 * Create new node as descendant from the parent node.
 * Align and offset relative to siblings.
 */
export const createNode = (
	canvas: Canvas,
	parentNodeData: CanvasNodeData,
	nodeOptions: { text: string, size?: { width?: number; height?: number } },
	nodeData?: Partial<ChatStreamNodeData>
) => {
	if (!canvas) {
		throw new Error('Invalid arguments')
	}

	const parentNode = canvas.nodes.get(parentNodeData.id)
	if (!parentNode) {
		throw new Error('Parent node not found')
	}

	const { text } = nodeOptions
	const width =
		nodeOptions?.size?.width || Math.max(minWidth, parentNode.width || 0)
	const height =
		nodeOptions?.size?.height ||
		Math.max(
			minHeight,
			calcHeight({ text, parentHeight: parentNode.height })
		)

	const siblings =
		parentNode &&
		canvas
			.getEdgesForNode(parentNode)
			.filter((n) => n.from.node.id == parentNode.id)
			.map((e) => e.to.node)

	// Failsafe leftmost value.
	const farLeft = parentNode.y - parentNode.width * 5
	const siblingsRight = siblings?.length
		? siblings.reduce(
			(right, sib) => Math.max(right, sib.x + sib.width),
			farLeft
		)
		: undefined
	const priorSibling = siblings[siblings.length - 1]

	// Position left at right of prior sibling, otherwise aligned with parent
	const x = siblingsRight != null ? siblingsRight + newNoteMargin : parentNode.x

	// Position top at prior sibling top, otherwise offset below parent
	const y =
		(priorSibling
			? priorSibling.y
			: parentNode.y + parentNode.height + newNoteMargin) +
		// Using position=left, y value is treated as vertical center
		height * 0.5

	const newNode = canvas.createTextNode({
		pos: { x, y },
		position: 'left',
		size: { height, width },
		text,
		focus: false
	})

	if (nodeData) {
		newNode.setData(nodeData)
	}

	canvas.deselectAll()
	canvas.addNode(newNode)

	addEdge(
		canvas,
		randomHexString(16),
		{
			nodeId: parentNode.id,
			side: 'bottom'
		},
		{
			nodeId: newNode.id,
			side: 'top'
		}
	)

	return newNode
}

/**
 * Add edge entry to canvas.
 */
export const addEdge = (
	canvas: Canvas,
	edgeID: string,
	from: EdgeAttachemnt,
	to: EdgeAttachemnt
) => {
	if (!canvas) return

	const data = canvas.getData()

	if (!data) return

	canvas.importData({
		edges: [
			...data.edges as CanvasEdgeData[],
			{
				id: edgeID,
				fromNode: from.nodeId,
				fromSide: from.side,
				toNode: to.nodeId,
				toSide: to.side
			}
		],
		nodes: data.nodes
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
