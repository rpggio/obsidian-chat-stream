import { App } from 'obsidian'
import { AllCanvasNodeData } from 'obsidian/canvas'

export interface CanvasNode {
   id: string
   app: App
   canvas: Canvas
   child: Partial<CanvasNode>
   color: string
   containerEl: HTMLElement
   containerBlockerEl: HTMLElement
   contentEl: HTMLElement
   destroyted: boolean
   height: number
   initialized: boolean
   isContentMounted: boolean
   isEditing: boolean
   nodeEl: HTMLElement
   placeholderEl: HTMLElement
   renderedZIndex: number
   resizeDirty: boolean
   text: string
   unknownData: Record<string, string>
   width: number
   x: number
   y: number
   zIndex: number
   convertToFile(): Promise<void>
   getData(): AllCanvasNodeData
   initialize(): void
   render(): void
   setData(data: AllCanvasNodeData): Promise<void>
   setText(text: string): Promise<void>
   showMenu(): void
}

export interface CanvasEdge {
   from: {
      node: CanvasNode
   }
   to: {
      node: CanvasNode
   }
}

export interface Canvas {
   edges: CanvasEdge[]
   nodes: CanvasNode[]
   getEdgesForNode(node: CanvasNode): CanvasEdge[]
}
