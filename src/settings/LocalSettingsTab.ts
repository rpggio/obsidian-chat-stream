import { App, PluginSettingTab, Setting } from "obsidian"
import { ThoughtThreadCanvasPlugin } from 'src/ThoughtThreadCanvasPlugin'
import { getModels } from './PluginSettings'

export class LocalSettingsTab extends PluginSettingTab {
  plugin: ThoughtThreadCanvasPlugin

  constructor(app: App, plugin: ThoughtThreadCanvasPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    let { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName("API Key")
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
      .setName('Model')
      .setDesc('This allows you to choose which model the chat view should utilize..')
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
  }
}

export default LocalSettingsTab