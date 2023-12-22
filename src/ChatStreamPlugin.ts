import { Plugin, App, PluginManifest } from 'obsidian'
import {
	ChatStreamSettings,
	DEFAULT_SETTINGS
} from './settings/ChatStreamSettings'
import SettingsTab from './settings/SettingsTab'
import { Logger } from './util/logging'
import { ChatStreamEvent, ModuleContext, PluginModule, eventKey } from './types'
import { canvasChatModule as createCanvasChatModule } from './modules/canvas-chat'

/**
 * Obsidian plugin implementation.
 * Note: Canvas has no supported API. This plugin uses internal APIs that may change without notice.
 */
export class ChatStreamPlugin extends Plugin implements ModuleContext {
	modules: PluginModule[]
	callbacks = new Map<string, Set<() => void>>()
	settings: ChatStreamSettings
	logDebug: Logger

	constructor(app: App, pluginManifest: PluginManifest, pluginPath: string) {
		super(app, pluginManifest)
	}

	on(event: ChatStreamEvent, callback: () => void): void {
		const key = eventKey(event)
		let callbacks = this.callbacks.get(key)
		if (!callbacks) {
			callbacks = new Set()
			this.callbacks.set(key, callbacks)
		}
		callbacks.add(callback)
	}

	off(callback: () => void) {
		this.callbacks.forEach(callbacks => callbacks.delete(callback))
	}

	private sendEvent(event: ChatStreamEvent) {
		const key = eventKey(event)
		const callbacks = this.callbacks.get(key)
		if (callbacks) {
			callbacks.forEach(callback => callback())
		}
	}

	getModule(id: string) {
		return this.modules.find(module => module.id === id)
	}

	async enableModule(moduleId: string) {
		const module = this.getModule(moduleId)
		if (!module) {
			throw new Error('Unknown module: ' + moduleId)
		}
		const setting = this.settings.moduleSettings.find((setting) => setting.module === moduleId)!
		setting.enabled = true
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
			createCanvasChatModule(this)
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
			callback: () => {
				this.sendEvent({ type: 'command', command: 'next-note' })
			},
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
			callback: () => {
				this.sendEvent({ type: 'command', command: 'generate-note' })
			},
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
		this.callbacks.clear()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
