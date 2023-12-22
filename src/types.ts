import { App } from 'obsidian'
import { ChatStreamSettings } from './settings/ChatStreamSettings'
import { Logger } from './util/logging'

export const chatStreamCommands = ['next-note', 'generate-note'] as const

export type ChatStreamCommand = typeof chatStreamCommands[number]

export type ChatStreamEvent = {
    type: 'command', command: ChatStreamCommand
}

export function eventKey(event: ChatStreamEvent) {
    if (event.type === 'command') {
        return event.type + '_' + event.command
    }
    throw new Error('Unknown event type: ' + event)
}

export interface ModuleContext {
    app: App
    settings: ChatStreamSettings

    on(event: ChatStreamEvent, callback: () => void): void
    off(callback: () => void): void

    logDebug: Logger
}

export interface PluginModule {
    id: string
    name: string
    description: string
    buildSettingsUI(container: HTMLElement): void
    load(): Promise<void>
    unload(): Promise<void>
}

export type ModuleFactory = (context: ModuleContext) => PluginModule
