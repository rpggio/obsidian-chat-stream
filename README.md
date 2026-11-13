# Chat Stream

Branch an AI conversation on Obsidian Canvas. Select a card, generate a reply, and return to any earlier card to explore another direction. The arrows determine the conversation context.

## Try it in two minutes

1. Install **Chat Stream** from Community plugins on Obsidian Desktop 1.11.5 or newer and enable the Canvas core plugin. To test a development build, see [CONTRIBUTING.md](CONTRIBUTING.md).
2. Copy [the sample Canvas and its Markdown notes](test-vault) into a vault. Open **Weekend plan.canvas**.
3. Select the left question card and run **Chat Stream: Preview context** from the command palette. The preview shows the linked field notes and the cards on that branch.
4. Set up AI Providers using the steps below, then run **Chat Stream: Generate AI note**. Select the purple reply and run **Chat Stream: Create next note** to continue. Select an earlier card to start another branch.

Assign your preferred shortcuts under **Settings → Hotkeys**. Search for Chat Stream to find all three commands.

## Connect an AI provider

1. Install and enable [AI Providers](https://community.obsidian.md/plugins/ai-providers) 1.13.0 or newer in the same vault.
2. In **Settings → AI Providers**, add a provider, configure its connection, and choose a model. Use **Refresh models list** to update the available models.
3. In **Settings → Chat Stream**, select the provider. Use its default model or choose another discovered chat model. If the model has reasoning modes declared in AI Providers, Chat Stream offers those modes and a provider-default option.

Upgrading from an earlier version? Set up the connection in AI Providers and select it in Chat Stream. Existing Canvas cards, assistant roles, and context preferences carry over.

### Network, privacy, and cost

- Preview context sends no request.
- Generation passes the system prompt, selected card, and included ancestor text, linked Markdown sections, and supported images to the provider configured in AI Providers.
- Use a model that supports vision for image cards. The input budget is approximate, and images count toward provider limits separately.
- AI Providers manages connection settings and API keys. Hosted providers may charge for generation.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for build and test instructions. The original Canvas integration drew on [Canvas MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap). Chat Stream is [MIT licensed](LICENSE).
