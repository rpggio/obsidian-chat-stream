import { App, ItemView } from 'obsidian'
import { Canvas, CanvasView } from './canvas-internal'

export function getActiveCanvasView(app: App) {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView)
    if (canvasView?.getViewType() !== 'canvas') return null
    return canvasView as CanvasView
}

export function getActiveCanvas(app: App): Canvas | null {
    return getActiveCanvasView(app)?.canvas || null
}
