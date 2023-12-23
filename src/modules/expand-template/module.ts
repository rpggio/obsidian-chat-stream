import { ChatStreamEvent, ModuleFactory } from '../../types'
import { TemplateExpansion } from './TemplateExpansion'

export const createExpandTemplateModule: ModuleFactory = context => {
    const templateExpansion = TemplateExpansion(context)

    const handleGenerateNote = async (event: ChatStreamEvent) => {
        const handled = await templateExpansion.expandIfTemplateNote()
        if (handled) {
            event.handled = true
        }
    }

    const load = async () => {
        context.on({ type: 'command', command: 'generate-note' }, handleGenerateNote)
    }

    const unload = async () => {
        context.off(handleGenerateNote)
    }

    return {
        id: 'expand-template',
        name: 'Expand Template',
        description: 'Treat note as a template if it has {{slots}}. Incoming named connections will be treated as input variables.',
        load,
        unload,
    }
}
