import { Plugin, App, PluginManifest } from 'obsidian'
import {
	ChatStreamSettings,
	DEFAULT_SETTINGS
} from './settings/ChatStreamSettings'
import SettingsTab from './settings/SettingsTab'
import { AINodeBuilder } from './ai-nodes'

/**
 * Obsidian plugin implementation.
 * Note: Canvas has no supported API. This plugin uses internal APIs that may change without notice.
 */
export class ChatStreamPlugin extends Plugin {
	settings: ChatStreamSettings
	aiNodeBuilder: AINodeBuilder
	constructor(app: App, pluginManifest: PluginManifest, pluginPath: string) {
		super(app, pluginManifest)
	}

	async onload() {
		await this.loadSettings()

		this.aiNodeBuilder = new AINodeBuilder(this.app, this.settings)

		this.addSettingTab(new SettingsTab(this.app, this))

		this.addCommand({
			id: 'next-note',
			name: 'Create next note',
			callback: () => {
				this.aiNodeBuilder.nextNote()
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
				this.aiNodeBuilder.generateNote()
			},
			hotkeys: [
				{
					modifiers: ['Alt', 'Shift'],
					key: 'G'
				}
			]
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
