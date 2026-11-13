import { initAI } from '@obsidian-ai-providers/sdk'
import { Notice, Plugin } from 'obsidian'
import type { ChatStreamSettings } from './settings/ChatStreamSettings'
import { migrateSettings } from './settings/migrateSettings'
import SettingsTab from './settings/SettingsTab'
import { noteGenerator } from './noteGenerator'

export class ChatStreamPlugin extends Plugin {
	settings: ChatStreamSettings
	private pendingSave = Promise.resolve()

	async onload() {
		const { settings, changed } = migrateSettings((await this.loadData()) as Partial<ChatStreamSettings> | null)
		this.settings = settings
		if (changed) await this.saveData(settings)

		const generator = noteGenerator(this.app, settings, (message, ...details) => {
			if (settings.debug) console.debug('Chat Stream:', message, ...details)
		})
		// Keep Canvas commands and settings usable while the companion is unavailable.
		await initAI(this.app, this, async () => {}, { disableFallback: true })
		this.register(generator.abortRequests)
		this.addSettingTab(new SettingsTab(this.app, this))

		this.addCommand({
			id: 'next-note',
			name: 'Create next note',
			callback: () => this.runCommand(generator.nextNote)
		})
		this.addCommand({
			id: 'generate-note',
			name: 'Generate AI note',
			callback: () => this.runCommand(generator.generateNote)
		})
		this.addCommand({
			id: 'preview-context',
			name: 'Preview context',
			callback: () => this.runCommand(generator.previewContext)
		})
	}

	persistSettings(): void {
		const snapshot = { ...this.settings }
		this.pendingSave = this.pendingSave
			.then(() => this.saveData(snapshot))
			.catch(() => { new Notice('Chat Stream could not save its settings.') })
	}

	private runCommand(command: () => Promise<void>): void {
		void command().catch(() => { new Notice('Chat Stream could not complete the Canvas command.') })
	}
}
