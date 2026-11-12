# Contributing

Install Node 22.13+ and the pnpm version pinned in `package.json`. Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, and `pnpm build`.

Copy `test-vault/` to a disposable sibling directory and open the copy as a vault. Copy `main.js`, `manifest.json`, and `styles.css` into its `.obsidian/plugins/chat-stream/` directory, then enable the plugin. After rebuilding, copy the artifacts again and use **Reload plugins** under Community plugins, or run `obsidian vault=<vault-name> plugin:reload id=chat-stream` if you have enabled Obsidian CLI.

The watch build from `pnpm dev` includes a local Offline demo. To test the production build without a provider key, set the endpoint override to a localhost Chat Completions stub. Use the sample vault walkthrough to verify the commands. Repeat on the minimum supported Obsidian desktop version and current stable. The live Canvas view integration uses internal methods and can change independently of the JSON Canvas file format.

Preview a branch review in the Obsidian Community dashboard before tagging. The GitHub workflow validates the build and attaches the three attested release assets. After a release, check the public Scorecard and add release-specific upgrade notes.
