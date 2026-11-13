import { App, PluginSettingTab, Setting } from 'obsidian'
import { chatModels, getAIProviders, providersPluginLink, reasoningModes } from '../ai/chat'
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

		void this.showConnection(containerEl.createDiv(), settings)

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

	private async showConnection(container: HTMLElement, settings: ChatStreamSettings): Promise<void> {
		const connection = new Setting(container).setName('AI Providers')
		const describe = (message: string) => {
			const description = createFragment()
			description.append(message, ' ')
			description.createEl('a', { text: 'AI Providers plugin page', href: providersPluginLink })
			connection.setDesc(description)
		}
		describe('Add providers and refresh models in Settings → AI Providers.')

		try {
			const ai = await getAIProviders(this.app)
			if (!ai.providers.length) {
				describe('No providers are configured in this vault. In Settings → AI Providers, choose Add provider and save a connection. Then return to Chat Stream to select it.')
				return
			}

			const provider = ai.providers.find(candidate => candidate.id === settings.providerId)
			new Setting(container)
				.setName('Provider')
				.setDesc('Choose a connection saved in Settings → AI Providers.')
				.addDropdown(dropdown => {
					dropdown.addOption('', 'Select a provider')
					for (const candidate of ai.providers) dropdown.addOption(candidate.id, candidate.name)
					dropdown.setValue(provider?.id ?? '').onChange(value => {
						settings.providerId = value
						settings.modelId = ''
						settings.reasoningMode = ''
						this.plugin.persistSettings()
						this.display()
					})
				})
			if (!provider) return

			const models = chatModels(ai, provider)
			const model = settings.modelId || provider.model
			const validModel = model && models.includes(model) ? model : undefined
			const defaultModel = provider.model && models.includes(provider.model) ? provider.model : undefined
			const modelSetting = new Setting(container).setName('Model')
			if (!models.length) {
				modelSetting.setDesc('Choose a chat model or refresh the model list in AI Providers.')
				return
			}
			if (!validModel) modelSetting.setDesc('Choose an available chat model.')
			modelSetting.addDropdown(dropdown => {
				dropdown.addOption('', defaultModel ? `Provider default (${defaultModel})` : 'Select a model')
				for (const id of models) dropdown.addOption(id, id)
				if (settings.modelId && !validModel) {
					dropdown.addOption(settings.modelId, `Unavailable (${settings.modelId})`)
				}
				dropdown.setValue(settings.modelId).onChange(value => {
					settings.modelId = value
					settings.reasoningMode = ''
					this.plugin.persistSettings()
					this.display()
				})
			})
			if (!validModel) return
			const modes = reasoningModes(ai, provider, validModel)
			if (!modes.length) return

			new Setting(container)
				.setName('Reasoning effort')
				.addDropdown(dropdown => {
					dropdown.addOption('', 'Provider default')
					for (const mode of modes) dropdown.addOption(mode, mode)
					dropdown.setValue(modes.includes(settings.reasoningMode) ? settings.reasoningMode : '')
						.onChange(value => {
							settings.reasoningMode = value
							this.plugin.persistSettings()
						})
				})
		} catch (error) {
			describe(error instanceof Error ? error.message : 'AI Providers is unavailable.')
		}
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
