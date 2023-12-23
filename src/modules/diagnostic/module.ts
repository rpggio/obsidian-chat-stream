import { getActiveCanvas } from 'src/obsidian'
import { ModuleContext } from 'src/types'

export function createDiagnosticModule(context: ModuleContext) {
    const { app } = context

    let loaded = false

    const handleDump = () => {
        const selection = getActiveCanvas(app)?.selection
        if (selection) {
            console.dir(selection)
        }
    }

    const load = async () => {
        loaded = true

        context.addCommand({
            id: 'dump-selection',
            name: 'Dump Selected Object',
            callback: () => {
                if (!loaded) return
                handleDump()
            },
            hotkeys: [
                {
                    modifiers: ['Alt', 'Shift'],
                    key: 'D'
                }
            ]
        })
    }

    const unload = async () => {
        loaded = false
    }

    return {
        id: 'diagnostic',
        name: 'Diagnostic',
        description: 'Diagnostic tools for debugging',
        hidden: true,
        load,
        unload,
    }
}
