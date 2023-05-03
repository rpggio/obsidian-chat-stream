import GPTPlugin from "main"
import { App, PluginSettingTab, Setting } from "obsidian"

class GPTSettingTab extends PluginSettingTab {
  plugin: GPTPlugin;

  constructor(app: App, plugin: GPTPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    let { gpt3 } = this.plugin.settings.models;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian GPT settings" });

    containerEl.createEl("h3", { text: "API Keys" });

    new Setting(containerEl)
      .setName("OpenAI API Key")
      .setDesc("Enter your OpenAI API Key")
      .addText((text) =>
        text
          .setPlaceholder("API Key")
          .setValue(gpt3.apiKey)
          .onChange(async (value) => {
            gpt3.apiKey = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

export default GPTSettingTab;