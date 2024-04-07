import { moment } from 'obsidian'
import { CanvasNodeData } from 'src/obsidian/canvas'
import { noteGenerator } from 'src/noteGenerator'

import { Canvas, getActiveCanvas, getNodeChildren, inboundEdges, readNoteContent } from 'src/obsidian'
import { Maybe, ModuleContext } from 'src/types'

const templateSlotRegex = /\{\{\s*([\w-]+)\s*\}\}/g

export function TemplateExpansion(context: ModuleContext) {
    const generator = noteGenerator(context)

    const isTemplate = (content: string) => {
        return content && content.match(templateSlotRegex) !== null
    }

    const expandTemplate = async (canvas: Canvas, noteData: CanvasNodeData, content: string) => {
        const node = canvas.nodes.get(noteData.id)
        if (!node) throw new Error('Node not found')
        const inbound = inboundEdges(canvas, node)

        const vars = new Map<string, Maybe<string>>()
        for (const edge of inbound) {
            if (edge.label) {
                const sourceContent = await readNoteContent(edge.from.node)
                vars.set(edge.label, sourceContent)
            }
        }

        vars.set('date', moment().format('YYYY-MM-DD'))
        vars.set('time', moment().format('HH:mm:ss'))
        vars.set('title', (noteData as any).file?.basename)

        let changed = false
        const replaced = content.replace(templateSlotRegex, (match, name) => {
            const value = vars.get(name)
            if (value) {
                changed = true
                return value
            } else {
                return match
            }
        })

        if (changed) {
            const children = getNodeChildren(node)
            if (children.length === 1) {
                // If single child, replace it
                await children[0].setText(replaced)
                await canvas.requestSave()
            } else {
                await generator.nextNote(replaced)
            }
        }

        return changed
    }

    const expandIfTemplateNote: () => Promise<boolean> = async () => {
        const canvas = getActiveCanvas(context.app)
        if (!canvas) return false

        const selectedNodes = canvas.getSelectionData().nodes
        if (selectedNodes.length !== 1) return false
        const nodeData = selectedNodes[0]
        const node = canvas.nodes.get(nodeData.id)
        if (!node) return false

        const content = await readNoteContent(node)
        if (!content) return false

        if (isTemplate(content)) {
            await expandTemplate(canvas, nodeData, content)
            return true
        }

        return false
    }

    return {
        isTemplate,
        expandTemplate,
        expandIfTemplateNote,
    }
}
