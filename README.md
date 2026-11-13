# Chat Stream

Branch an AI conversation on Obsidian Canvas. Select a card, generate a reply, and return to any earlier card to explore another direction. Incoming arrows determine what goes into the conversation.

![Animated example of Chat Stream generating a reply and branching a conversation on Obsidian Canvas](https://rpggio.github.io/media/chat-stream-example.gif)

## Usage

Open or create a Canvas in your vault, select a text card with a question, and press **Alt+Shift+G** (**Option+Shift+G** on Mac) after assigning it to **Chat Stream: Generate AI note** in **Settings → Hotkeys**. Chat Stream adds a purple reply connected to that card. Select an earlier card and generate again to start another branch.

You can also run **Chat Stream: Generate AI note** from the command palette.

## Setup

In your vault on Obsidian Desktop 1.13.0 or newer, go to **Settings → Community plugins → Browse**, then install and enable [Chat Stream](https://community.obsidian.md/plugins/chat-stream). Check that **Canvas** is enabled under **Settings → Core plugins**.

### Connect a provider

> **Upgrading to 2.0.0:** Configure your connection in **AI Providers**, then select it again in **Chat Stream**. Chat Stream does not transfer its old endpoint, API key, or model selection. Existing Canvas cards, assistant roles, and saved conversation preferences carry over.

1. Install and enable [AI Providers](https://community.obsidian.md/plugins/ai-providers) 1.13.0 or newer in the same vault.
2. Open **Settings → AI Providers**. Click **Add provider (+)**, choose a provider type, fill in its connection details, and choose a default chat model. Use **Refresh models list** in the connection editor if your model is missing, then save the connection.

   ![AI Providers settings, showing the Add provider button and two saved connections](static/ai-providers-settings.png)

3. Open **Settings → Chat Stream**. Choose the saved connection under **Provider** and keep its default model or pick a different **Model**. If AI Providers lists reasoning modes for the selected model, you can also choose a **Reasoning effort**.

   ![Chat Stream settings, showing the Provider and Model dropdowns filled in](static/chat-stream-settings.png)

## Commands and hotkeys

Find these commands in the command palette under **Chat Stream**. To set shortcuts, go to **Settings → Hotkeys** and search for Chat Stream.

| Command | What it does | Suggested shortcut (Windows / macOS) |
| --- | --- | --- |
| **Generate AI note** | Adds a reply to the selected card using its branch as context. | Alt+Shift+G / Option+Shift+G |
| **Create next note** | Adds a connected card for your follow-up. | Alt+Shift+N / Option+Shift+N |
| **Preview context** | Shows what would be sent without making a request. | Alt+Shift+P / Option+Shift+P |

To give a question more context, draw an arrow from a text card or Markdown note toward it. Run **Preview context** on the question to see what Chat Stream will include.

## Network, privacy, and cost

- **Preview context** works locally. **Generate AI note** sends the system prompt and included Canvas text, linked Markdown content, and supported images (PNG or JPEG) to the endpoint configured in AI Providers. Check the preview before sending private material.
- AI Providers manages connections and credentials. Hosted providers generally require an account or API key and may charge for generation. Local providers require a running local model server.
- Use a model that supports vision for image cards. The text budget is approximate; images count toward provider limits separately.

## Known limitations

- Open **Chat Stream** from the settings sidebar under **Community plugins**. On Obsidian 1.13 or newer, you can also find its options using settings search.
- Some OpenRouter models can return `<think>` blocks. Chat Stream saves them as part of the reply, so they can also be included in later branch context.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for build and test instructions. The original Canvas integration drew on [Canvas MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap). Provider access uses Pavel Frankov's [AI Providers SDK](https://github.com/pfrankov/obsidian-ai-providers/tree/master/packages/sdk). Chat Stream is [MIT licensed](LICENSE).
