# Contributing

Install Node 22.13+ and the pnpm version pinned in `package.json`. Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, and `pnpm build`.

Copy `test-vault/` to a disposable sibling directory and open the copy as a vault. Copy `main.js`, `manifest.json`, and `styles.css` into its `.obsidian/plugins/chat-stream/` directory, then enable the plugin and [AI Providers](https://community.obsidian.md/plugins/ai-providers) 1.13.0 or newer. After rebuilding, copy the artifacts again and use **Reload plugins** under Community plugins, or run `obsidian vault=<vault-name> plugin:reload id=chat-stream` if you have enabled Obsidian CLI.

For a keyless smoke test, configure AI Providers with an LM Studio connection pointing to a loopback OpenAI-compatible stub. The stub should serve `GET /v1/models` and `POST /v1/chat/completions` with a streaming response and support a rejected request for a second model. Refresh models in AI Providers, then select the test provider in Chat Stream and exercise the sample Canvas. Check both context previews, generate an assistant reply, add a follow-up, and reopen the Canvas to verify the cards and edges. Repeat on the minimum supported Obsidian desktop version and current stable. The live Canvas view integration uses internal methods and can change independently of the JSON Canvas file format.

Run the [Community preview scan](https://docs.obsidian.md/community-directory/manage-entry#fix-a-failed-review) against the exact candidate commit before tagging. See [HANDOFF.md](HANDOFF.md) for the release checklist, upgrade notes, and pending checks.
