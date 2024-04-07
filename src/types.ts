import { App, Command } from 'obsidian'
import { ChatStreamSettings } from './settings/ChatStreamSettings'
import { Logger } from './util/logging'
import { CanvasNodeData } from './obsidian'

export type Maybe<T> = T | null | undefined

export const chatStreamCommands = ['next-note', 'generate-note', 'dump-selection'] as const

export type ChatStreamCommand = typeof chatStreamCommands[number]

export type ChatStreamEventType = {
    type: 'command', command: ChatStreamCommand
}

export type ChatStreamEvent = {
    type: ChatStreamEventType
    handled: boolean
}

export type ChatStreamEventHandler = (event: ChatStreamEvent) => Promise<unknown>

export interface ChatStreamNodeData extends CanvasNodeData {
    chat_role: 'user' | 'assistant'
}

export function eventKey(event: ChatStreamEventType) {
    if (event.type === 'command') {
        return event.type + '_' + event.command
    }
    throw new Error('Unknown event type: ' + event)
}

export interface ModuleContext {
    app: App
    settings: ChatStreamSettings
    addCommand(command: Command): Command

    on(event: ChatStreamEventType, handler: ChatStreamEventHandler): void
    off(hadler: ChatStreamEventHandler): void

    logDebug: Logger
}

export interface PluginModule {
    id: string
    name: string
    description: string
    hidden?: boolean
    buildSettingsUI?(container: HTMLElement): void
    load(): Promise<void>
    unload(): Promise<void>
}

export type ModuleFactory = (context: ModuleContext) => PluginModule
