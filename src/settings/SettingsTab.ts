import { App, Notice, PluginSettingTab, SecretComponent, Setting } from 'obsidian'
import { completeChat, getConnection } from '../ai/chat'
import { endpointValue, Provider, PROVIDERS, sameOrigin } from '../ai/connection'
import type { ChatStreamPlugin } from '../ChatStreamPlugin'
import type { ChatStreamSettings } from './ChatStreamSettings'

// The display API also works on Obsidian 1.11 and 1.12.
export default class SettingsTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ChatStreamPlugin) {
		super(app, plugin)
	}

	display(): void {
		const { containerEl, plugin } = this
		const { settings } = plugin
		containerEl.empty()

		new Setting(containerEl)
			.setName('Provider')
			.setDesc('Choose a provider preset. Use the endpoint override for another compatible server.')
			.addDropdown(dropdown => {
				for (const [id, provider] of Object.entries(PROVIDERS)) dropdown.addOption(id, provider.label)
				if (CHAT_STREAM_DEV) dropdown.addOption('demo', 'Offline demo')
				dropdown.setValue(settings.provider).onChange(value => {
					const provider = value as Provider
					settings.provider = provider
					settings.endpointOverride = ''
					settings.apiModel = provider === 'demo' ? '' : PROVIDERS[provider].model
					settings.secretName = ''
					plugin.persistSettings()
					this.display()
				})
			})

		if (settings.provider !== 'demo') this.showConnection(settings)

		new Setting(containerEl)
			.setName('System prompt')
			.setDesc('A Canvas ancestor beginning with SYSTEM PROMPT overrides this setting.')
			.addTextArea(text => {
				text.inputEl.addClass('chat-stream-prompt')
				text.setValue(settings.systemPrompt).onChange(value => {
					settings.systemPrompt = value
					plugin.persistSettings()
				})
			})

		this.showLimit('Max input tokens', 'Approximate text budget. 0 uses the default budget.', 'maxInputTokens')
		this.showLimit('Max response tokens', '0 lets the provider choose.', 'maxResponseTokens')
		this.showLimit('Max depth', 'How far back to include ancestors. 0 uses the full branch.', 'maxDepth')
		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Optional sampling temperature from 0 to 2. Leave blank for the model default.')
			.addText(text => {
				text.inputEl.type = 'number'
				text.inputEl.min = '0'
				text.inputEl.max = '2'
				text.inputEl.step = 'any'
				text.setValue(settings.temperature?.toString() ?? '').onChange(value => {
					const temperature = value === '' ? null : Number(value)
					if (temperature === null || (temperature >= 0 && temperature <= 2)) {
						settings.temperature = temperature
						plugin.persistSettings()
					}
				})
			})

		new Setting(containerEl)
			.setName('Debug output')
			.setDesc('Log workflow diagnostics to the developer console.')
			.addToggle(toggle => toggle.setValue(settings.debug).onChange(value => {
				settings.debug = value
				plugin.persistSettings()
			}))
	}

	private showConnection(settings: ChatStreamSettings): void {
		const { containerEl, plugin } = this
		let secretPicker: SecretComponent
		const provider = settings.provider
		if (provider === 'demo') return

		new Setting(containerEl)
			.setName('Endpoint override')
			.setDesc('Leave blank for the provider preset, or enter a compatible base URL or chat completions URL.')
			.addText(text => {
				text.inputEl.addClass('chat-stream-endpoint')
				text.setPlaceholder(PROVIDERS[provider].endpoint).setValue(settings.endpointOverride).onChange(value => {
					const previous = endpointValue(settings)
					settings.endpointOverride = value
					if (!sameOrigin(previous, endpointValue(settings))) {
						settings.secretName = ''
						secretPicker.setValue('')
					}
					plugin.persistSettings()
				})
			})

		new Setting(containerEl)
			.setName('Model ID')
			.setDesc('Use the exact ID from your provider.')
			.addText(text => text.setValue(settings.apiModel).onChange(value => {
				settings.apiModel = value
				plugin.persistSettings()
			}))

		const keyDescription = createFragment()
		keyDescription.append('Stored in Obsidian Secret Storage. Leave unlinked for a compatible server that needs no key. ')
		if (provider === 'openai' || provider === 'openrouter') {
			keyDescription.createEl('a', {
				text: 'Create an API key',
				href: provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://openrouter.ai/settings/keys'
			})
		}
		new Setting(containerEl)
			.setName('API key')
			.setDesc(keyDescription)
			.addComponent(el => {
				secretPicker = new SecretComponent(this.app, el)
					.setValue(settings.secretName)
					.onChange(value => {
						settings.secretName = value ?? ''
						plugin.persistSettings()
					})
				return secretPicker
			})

		new Setting(containerEl)
			.setName('Connection')
			.setDesc('Sends a short test prompt to the configured endpoint. It may incur provider charges.')
			.addButton(button => button.setButtonText('Test connection').onClick(async () => {
				button.setDisabled(true)
				try {
					const connection = getConnection(this.app, settings)
					await completeChat(connection, [{ role: 'user', content: 'Reply with OK.' }], { maxResponseTokens: 1024 })
					new Notice(`Chat Stream connected to ${connection.destination}.`)
				} catch (error) {
					new Notice(error instanceof Error ? error.message : 'Could not test the connection.')
				} finally {
					button.setDisabled(false)
				}
			}))

	}

	private showLimit(name: string, description: string, key: 'maxInputTokens' | 'maxResponseTokens' | 'maxDepth') {
		const { settings } = this.plugin
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(description)
			.addText(text => {
				text.inputEl.type = 'number'
				text.inputEl.min = '0'
				text.setValue(settings[key].toString()).onChange(value => {
					const limit = Number(value)
					if (Number.isSafeInteger(limit) && limit >= 0) {
						settings[key] = limit
						this.plugin.persistSettings()
					}
				})
			})
	}
}
