import { moment } from 'obsidian'
import { noteGenerator } from 'src/noteGenerator'

import { readNoteContent } from 'src/obsidian'
import { CanvasNode } from 'src/obsidian/canvas-internal'
import { getActiveCanvas, inboundEdges } from 'src/obsidian/canvasUtil'
import { Maybe, ModuleContext } from 'src/types'

const templateSlotRegex = /\{\{\s*([\w-]+)\s*\}\}/g

export function TemplateExpansion(context: ModuleContext) {
    const generator = noteGenerator(context)

    const isTemplate = (_: CanvasNode, content: string) => {
        return content && content.match(templateSlotRegex) !== null
    }

    const expandTemplate = async (note: CanvasNode, content: string) => {
        const inbound = inboundEdges(note)

        const vars = new Map<string, Maybe<string>>()
        for (const edge of inbound) {
            if (edge.label) {
                const sourceContent = await readNoteContent(edge.from.node)
                vars.set(edge.label, sourceContent)
            }
        }

        vars.set('date', moment().format('YYYY-MM-DD'))
        vars.set('time', moment().format('HH:mm:ss'))
        vars.set('title', (note as any).file?.basename)

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
            await generator.nextNote(replaced)
        }

        return changed
    }

    const expandIfTemplateNote: () => Promise<boolean> = async () => {
        const canvas = getActiveCanvas(context.app)
        if (!canvas) return false

        const selection = canvas.selection
        if (selection?.size !== 1) return false

        const values = Array.from(selection.values())
        const note = values[0]

        const content = await readNoteContent(note)
        if (!content) return false

        if (isTemplate(note, content)) {
            await expandTemplate(note, content)
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
