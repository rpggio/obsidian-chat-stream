import { noteGenerator } from '../../noteGenerator'
import { ModuleFactory } from '../../types'

export const canvasChatModule: ModuleFactory = context => {
    const { app, settings, logDebug } = context

    const generator = noteGenerator(app, settings, logDebug)

    const handleGenerateNote = () => {
        generator.generateNote()
    }

    const handleNextNote = () => {
        generator.nextNote()
    }

    const buildSettingsUI = (container: HTMLElement) => {
    }

    const load = async () => {
        context.on({ type: 'command', command: 'next-note' }, handleNextNote)
        context.on({ type: 'command', command: 'generate-note' }, handleGenerateNote)
    }

    const unload = async () => {
        context.off(handleNextNote)
        context.off(handleGenerateNote)
    }

    return {
        id: 'canvas-chat',
        name: 'Canvas Chat',
        description: 'Basic chat interactions for canvas',
        load,
        unload,
        buildSettingsUI,
    }
}
