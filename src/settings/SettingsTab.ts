import { App, PluginSettingTab, Setting } from "obsidian"
import { ChatStreamPlugin } from 'src/ChatStreamPlugin'
import { getModels } from './ChatStreamSettings'

export class SettingsTab extends PluginSettingTab {
  plugin: ChatStreamPlugin

  constructor(app: App, plugin: ChatStreamPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    let { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName('Model')
      .setDesc('Select the GPT model to use.')
      .addDropdown((cb) => {
        getModels().forEach((model) => {
          cb.addOption(model, model)
        })
        cb.setValue(this.plugin.settings.apiModel)
        cb.onChange(async (value) => {
          this.plugin.settings.apiModel = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName("API key")
      .setDesc(
        "The API key to use when making requests - Get from OpenAI"
      )
      .addText((text) =>
        text
          .setPlaceholder("API Key")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value
            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('System prompt')
      .setDesc('The system prompt sent with each request to the API.')
      .addTextArea((component) => {
        component.inputEl.rows = 6
        component.inputEl.style.width = '300px'
        component.inputEl.style.fontSize = '10px'
        component.setValue(this.plugin.settings.systemPrompt)
        component.onChange(async (value) => {
          this.plugin.settings.systemPrompt = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName('Max input characters')
      .setDesc('The maximum number of characters to send to the API (includes system prompt).')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.maxInputCharacters.toString())
          .onChange(async (value) => {
            const parsed = parseInt(value)
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.maxInputCharacters = parsed
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(containerEl)
      .setName('Max response tokens')
      .setDesc('The maximum number of _tokens_ to return from the API. 0 means no limit. (A token is about 4 characters).')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.maxResponseTokens.toString())
          .onChange(async (value) => {
            const parsed = parseInt(value)
            if (!isNaN(parsed)) {
              this.plugin.settings.maxResponseTokens = parsed
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(containerEl)
      .setName('Max depth')
      .setDesc('The maximum depth of ancestor notes to include. 0 means no limit.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.maxDepth.toString())
          .onChange(async (value) => {
            const parsed = parseInt(value)
            if (!isNaN(parsed)) {
              this.plugin.settings.maxDepth = parsed
              await this.plugin.saveSettings()
            }
          })
      )

    new Setting(containerEl)
      .setName("Debug output")
      .setDesc(
        "Enable debug output in the console"
      )
      .addToggle(component => {
        component.setValue(this.plugin.settings.debug)
          .onChange(async (value) => {
            this.plugin.settings.debug = value
            await this.plugin.saveSettings()
          })
      })

  }
}

export default SettingsTab