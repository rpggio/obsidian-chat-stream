import { noteGenerator } from '../../noteGenerator'
import { ChatStreamEvent, ModuleFactory } from '../../types'

export const createCanvasChatModule: ModuleFactory = context => {
    const generator = noteGenerator(context)

    const handleNextNote = async (event: ChatStreamEvent) => {
        const handled = await generator.nextNote()
        if (handled) {
            event.handled = true
        }
    }

    const handleGenerateNote = async (event: ChatStreamEvent) => {
        const handled = await generator.generateNote()
        if (handled) {
            event.handled = true
        }
    }

    const load = async () => {
        context.on({ type: 'command', command: 'generate-note' }, handleGenerateNote)
        context.on({ type: 'command', command: 'next-note' }, handleNextNote)
    }

    const unload = async () => {
        context.off(handleGenerateNote)
        context.off(handleNextNote)
    }

    return {
        id: 'canvas-chat',
        name: 'Canvas Chat',
        description: 'Basic chat interactions for canvas',
        load,
        unload,
    }
}
