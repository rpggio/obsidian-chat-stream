# Chat Stream

Branch an AI conversation on Obsidian Canvas. Select a card, generate a reply, and return to any earlier card to explore another direction. The arrows determine the conversation context.

## Try it in two minutes

1. Install **Chat Stream** from Community plugins on Obsidian Desktop 1.11.5 or newer and enable the Canvas core plugin. To test a development build, see [CONTRIBUTING.md](CONTRIBUTING.md).
2. Copy [the sample Canvas and its Markdown notes](test-vault) into a vault. Open **Weekend plan.canvas**.
3. Select the left question card and run **Chat Stream: Preview context** from the command palette. The preview shows the linked field notes and the cards on that branch.
4. Connect a provider using the steps below, then run **Chat Stream: Generate AI note**. Select the purple reply and run **Chat Stream: Create next note** to continue. Select an earlier card to start another branch.

Assign your preferred shortcuts under **Settings → Hotkeys**. Search for Chat Stream to find all three commands.

## Connect an AI provider

| Provider | Setup |
| --- | --- |
| OpenRouter | Create a key in your OpenRouter account, choose or add it in the API key picker, and enter an OpenRouter model ID. |
| OpenAI | Create a key in your OpenAI API account, choose or add it in the API key picker, and enter an OpenAI model ID. |

Leave **Endpoint override** blank to use the preset. For Ollama, LM Studio, or another compatible service, enter its OpenAI-compatible base URL (including any API version path) or the full `/chat/completions` URL and its model ID. Choose a key if your server requires one.

Click **Test connection** before generating. Use a model that supports chat and, if using image cards, accepts image input. Leave temperature blank to use the provider's default. The text input budget is approximate across providers, and images count toward provider limits separately.

### Network, privacy, and cost

- Preview context sends no request.
- Generation sends the system prompt, selected card, and included ancestor text, linked Markdown sections, and supported images to the configured endpoint. The built-in presets use `openrouter.ai` and `api.openai.com`. OpenRouter can route requests to the model provider you select.
- Test connection sends a short synthetic prompt to the same endpoint. Hosted services require a provider account and may charge for test calls and generation. Chat Stream is free.
- Keys are stored in Obsidian Secret Storage. On upgrade, the plugin moves the old key out of its settings file. If a previously used key appeared in shared logs or backups, rotate it with the provider.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for build and test instructions. The original Canvas integration drew on [Canvas MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap). Chat Stream is [MIT licensed](LICENSE).
