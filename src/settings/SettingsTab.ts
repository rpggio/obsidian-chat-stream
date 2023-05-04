import { App, PluginSettingTab, Setting } from "obsidian"
import { TTCanvasPlugin } from 'src/TTCanvasPlugin'
import { getModels } from './TTSettings'

export class SettingsTab extends PluginSettingTab {
  plugin: TTCanvasPlugin

  constructor(app: App, plugin: TTCanvasPlugin) {
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

export default SettingsTab