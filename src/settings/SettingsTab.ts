import { App, PluginSettingTab, Setting, type SettingDefinitionRender } from 'obsidian'
import { chatModels, getAIProviders, providersPluginLink, reasoningModes } from '../ai/chat'
import type { ChatStreamPlugin } from '../ChatStreamPlugin'

export default class SettingsTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ChatStreamPlugin) {
		super(app, plugin)
	}

	getSettingDefinitions() {
		let service: ReturnType<typeof getAIProviders> | undefined
		const connection = (name: string, desc: string, render: (
			row: Setting, ai: Awaited<ReturnType<typeof getAIProviders>>
		) => void): SettingDefinitionRender => ({
			name, desc,
			render: row => {
				let active = true
				service ??= getAIProviders(this.app)
				void service.then(ai => {
					if (active && row.settingEl.isConnected) render(row, ai)
				}).catch(error => {
					if (active && row.settingEl.isConnected && name === 'Provider') {
						row.setDesc(error instanceof Error ? error.message : 'AI Providers is unavailable.')
					}
				})
				return () => { active = false }
			}
		})
		const { settings } = this.plugin
		const save = () => this.plugin.persistSettings()
		const refresh = () => {
			save()
			if (typeof this.update === 'function') this.update()
			else this.renderLegacySettings()
		}
		const findProvider = (ai: Awaited<ReturnType<typeof getAIProviders>>) =>
			ai.providers.find(provider => provider.id === settings.providerId)
		const limit = (name: string, desc: string, key: 'maxInputTokens' | 'maxResponseTokens' | 'maxDepth'): SettingDefinitionRender => ({
			name, desc,
			render: row => {
				row.addText(text => {
					text.inputEl.type = 'number'
					text.inputEl.min = '0'
					text.setValue(String(settings[key])).onChange(value => {
						const number = Number(value)
						if (Number.isSafeInteger(number) && number >= 0) {
							settings[key] = number
							save()
						}
					})
				})
			}
		})
		const providerHelp = createFragment()
		providerHelp.append('Add providers and refresh models in Settings → AI Providers. ')
		providerHelp.createEl('a', { text: 'AI Providers plugin page', href: providersPluginLink })
		return [{
			type: 'group' as const, heading: 'Connection', items: [
				{ name: 'AI Providers', desc: providerHelp, render: () => {} },
				connection('Provider', 'Choose a connection saved in Settings → AI Providers.', (row, ai) => {
					const provider = findProvider(ai)
					if (!ai.providers.length) {
						row.setDesc('Add a connection in Settings → AI Providers, then select it here.')
						return
					}
					if (settings.providerId && !provider) row.setDesc('The saved provider is no longer available. Choose another connection.')
					row.addDropdown(dropdown => {
						dropdown.addOption('', 'Select a provider')
						for (const candidate of ai.providers) dropdown.addOption(candidate.id, candidate.name)
						dropdown.setValue(provider?.id ?? '').onChange(value => {
							settings.providerId = value
							settings.modelId = ''
							settings.reasoningMode = ''
							refresh()
						})
					})
				}),
				connection('Model', 'Choose a provider to see available models.', (row, ai) => {
					const provider = findProvider(ai)
					if (!provider) return
					const models = chatModels(ai, provider)
					const defaultModel = provider.model && models.includes(provider.model) ? provider.model : undefined
					row.setDesc(models.length ? 'Use the provider default or choose another chat model.' : 'Refresh the model list in Settings → AI Providers.')
					if (!models.length) return
					row.addDropdown(dropdown => {
						dropdown.addOption('', defaultModel ? `Provider default (${defaultModel})` : 'Select a model')
						for (const id of models) dropdown.addOption(id, id)
						if (settings.modelId && !models.includes(settings.modelId)) dropdown.addOption(settings.modelId, `Unavailable (${settings.modelId})`)
						dropdown.setValue(settings.modelId).onChange(value => {
							settings.modelId = value
							settings.reasoningMode = ''
							refresh()
						})
					})
				}),
				connection('Reasoning effort', 'Available when the selected model declares reasoning modes.', (row, ai) => {
					const provider = findProvider(ai)
					const model = settings.modelId || provider?.model
					if (!provider || !model || !chatModels(ai, provider).includes(model)) return
					const modes = reasoningModes(ai, provider, model)
					if (!modes.length) return
					row.addDropdown(dropdown => {
						dropdown.addOption('', 'Provider default')
						for (const mode of modes) dropdown.addOption(mode, mode)
						dropdown.setValue(modes.includes(settings.reasoningMode) ? settings.reasoningMode : '').onChange(value => {
							settings.reasoningMode = value
							save()
						})
					})
				})
			]
		}, {
			type: 'group' as const, heading: 'Conversation', items: [
				{ name: 'System prompt', desc: 'A Canvas ancestor beginning with SYSTEM PROMPT overrides this setting.', render: (row: Setting) => {
					row.addTextArea(text => {
						text.inputEl.addClass('chat-stream-prompt')
						text.setValue(settings.systemPrompt).onChange(value => {
							settings.systemPrompt = value
							save()
						})
					})
				} },
				limit('Max input tokens', 'Approximate text budget. 0 uses the default budget.', 'maxInputTokens'),
				limit('Max response tokens', '0 lets the provider choose.', 'maxResponseTokens'),
				limit('Max depth', 'How far back to include ancestors. 0 uses the full branch.', 'maxDepth'),
				{ name: 'Temperature', desc: 'Optional sampling temperature from 0 to 2. Leave blank for the model default.', render: (row: Setting) => {
					row.addText(text => {
						text.inputEl.type = 'number'
						text.inputEl.min = '0'
						text.inputEl.max = '2'
						text.inputEl.step = 'any'
						text.setValue(settings.temperature?.toString() ?? '').onChange(value => {
							const temperature = value === '' ? null : Number(value)
							if (temperature === null || (temperature >= 0 && temperature <= 2)) {
								settings.temperature = temperature
								save()
							}
						})
					})
				} },
				{ name: 'Debug output', desc: 'Log workflow diagnostics to the developer console.', render: (row: Setting) => {
					row.addToggle(toggle => toggle.setValue(settings.debug).onChange(value => {
						settings.debug = value
						save()
					}))
				} }
			]
		}]
	}

	// Obsidian 1.11 and 1.12 render the same rows through the legacy API.
	display(): void {
		this.renderLegacySettings()
	}

	private renderLegacySettings(): void {
		const { containerEl } = this
		containerEl.empty()
		for (const group of this.getSettingDefinitions()) {
			new Setting(containerEl).setName(group.heading).setHeading()
			for (const definition of group.items) {
				const row = new Setting(containerEl).setName(definition.name)
				if (definition.desc) row.setDesc(definition.desc)
				// Render callbacks use only the row, so this also works without SettingGroup.
				;(definition.render as (setting: Setting) => void)(row)
			}
		}
	}
}
