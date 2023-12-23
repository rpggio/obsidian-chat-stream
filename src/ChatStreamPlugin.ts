import { Plugin, App, PluginManifest } from 'obsidian'
import {
	ChatStreamSettings,
	DEFAULT_SETTINGS
} from './settings/ChatStreamSettings'
import SettingsTab from './settings/SettingsTab'
import { Logger } from './util/logging'
import { ChatStreamEvent, ChatStreamEventHandler, ChatStreamEventType, ModuleContext, PluginModule, eventKey } from './types'
import { createCanvasChatModule as createCanvasChatModule } from './modules/canvas-chat/module'
import { createDiagnosticModule } from './modules/diagnostic/module'
import { createExpandTemplateModule } from './modules/expand-template/module'

/**
 * Obsidian plugin implementation.
 * Note: Canvas has no supported API. This plugin uses internal APIs that may change without notice.
 */
export class ChatStreamPlugin extends Plugin implements ModuleContext {
	modules: PluginModule[]
	handlers = new Map<string, Set<ChatStreamEventHandler>>()
	settings: ChatStreamSettings
	logDebug: Logger

	constructor(app: App, pluginManifest: PluginManifest, pluginPath: string) {
		super(app, pluginManifest)
	}

	on(event: ChatStreamEventType, handler: ChatStreamEventHandler): void {
		const key = eventKey(event)
		let handlers = this.handlers.get(key)
		if (!handlers) {
			handlers = new Set()
			this.handlers.set(key, handlers)
		}
		handlers.add(handler)
	}

	off(callback: ChatStreamEventHandler) {
		this.handlers.forEach(callbacks => callbacks.delete(callback))
	}

	private async sendEvent(type: ChatStreamEventType) {
		const key = eventKey(type)
		const handlers = this.handlers.get(key)
		if (handlers) {
			const event: ChatStreamEvent = {
				type,
				handled: false
			}

			this.logDebug(`Sending event ${type}`)

			// Send events in reverse order, so last added handler
			// has first chance to handle the event.
			for (const handler of Array.from(handlers).reverse()) {
				await handler(event)
				if (event.handled) {
					this.logDebug(`Handled by ${handler}`)
					break
				}
			}

			if (!event.handled) {
				this.logDebug(`Event not handled`)
			}
		}
	}

	getModule(id: string) {
		return this.modules.find(module => module.id === id)
	}

	isModuleEnabled(moduleId: string) {
		return this.settings.moduleSettings.find(
			(setting) => setting.module === moduleId)?.enabled ?? false
	}

	async enableModule(moduleId: string) {
		const module = this.getModule(moduleId)
		if (!module) {
			throw new Error('Unknown module: ' + moduleId)
		}
		const setting = this.settings.moduleSettings.find((setting) => setting.module === moduleId)
		if (!setting) {
			this.settings.moduleSettings.push({
				module: moduleId,
				enabled: true
			})
		} else {
			setting.enabled = true
		}

		await module.load()
		await this.saveSettings()

		console.log('Enabled module: ' + moduleId)
	}

	async disableModule(moduleId: string) {
		const module = this.getModule(moduleId)
		if (!module) {
			throw new Error('Unknown module: ' + moduleId)
		}
		const setting = this.settings.moduleSettings.find((setting) => setting.module === moduleId)!
		setting.enabled = false
		await module.unload()
		await this.saveSettings()

		console.log('Disabled module: ' + moduleId)
	}

	async onload() {
		await this.loadSettings()

		this.logDebug = this.settings.debug
			? (message?: unknown, ...optionalParams: unknown[]) =>
				console.debug('Chat Stream: ' + message, ...optionalParams)
			: () => { }

		this.logDebug('Debug logging enabled')
		this.modules = [
			createCanvasChatModule(this),
			createExpandTemplateModule(this),
			createDiagnosticModule(this)
		]

		for (const module of this.modules) {
			const setting = this.settings.moduleSettings.find((setting) => setting.module === module.id)
			if (setting?.enabled) {
				module.load()
			}
		}

		this.addSettingTab(new SettingsTab(this.app, this))

		this.addCommand({
			id: 'next-note',
			name: 'Create next note',
			callback: () =>
				this.sendEvent({ type: 'command', command: 'next-note' })
			,
			hotkeys: [
				{
					modifiers: ['Alt', 'Shift'],
					key: 'N'
				}
			]
		})

		this.addCommand({
			id: 'generate-note',
			name: 'Generate AI note',
			callback: () =>
				this.sendEvent({ type: 'command', command: 'generate-note' })
			,
			hotkeys: [
				{
					modifiers: ['Alt', 'Shift'],
					key: 'G'
				}
			]
		})
	}

	onunload() {
		this.modules.forEach(module => module.unload())
		this.handlers.clear()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
