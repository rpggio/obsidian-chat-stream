import { App, ItemView } from 'obsidian'
import { CanvasView } from './canvas-patches'

export function getActiveCanvas(app: App) {
    const maybeCanvasView = app.workspace.getActiveViewOfType(
        ItemView
    ) as CanvasView | null
    return maybeCanvasView ? maybeCanvasView['canvas'] : null
}
