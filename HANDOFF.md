# Chat Stream 1.5.0 release handoff

Chat Stream now delegates provider configuration, model discovery, and inference to AI Providers (1.13.0+) via its SDK. This release is prepared locally and has not been tagged or published.

## Upgrade note for users

**Upgrading from 1.4.8 or earlier:** Configure your connection in **Settings → AI Providers**, then select it again in **Settings → Chat Stream**. The old endpoint, API key, and model selection are not carried over. Existing Canvas cards, assistant roles, and saved conversation preferences carry over. To restore the old default shortcuts, assign them in **Settings → Hotkeys**.

## Before tagging

1. Run the checks in [CONTRIBUTING.md](CONTRIBUTING.md), including a smoke test on the declared minimum Obsidian desktop version (1.11.5). Chat Stream uses internal Canvas APIs to add and connect cards in the active view, so lint and unit tests alone cannot establish version compatibility.
2. Commit the release candidate and push a branch to `rpggio/obsidian-chat-stream`. Sign in to [Obsidian Community](https://community.obsidian.md/) as the Chat Stream owner. Open **Plugins → Chat Stream → Review branch**, enter the final candidate commit SHA, and select **Run preview scan**. Save the result with the release notes and resolve any blocking findings. The browser was signed out during release prep, and the local changes were not on GitHub, so the official preview has not run.
3. Tag the scanned commit `1.5.0` after the scan passes. The tag workflow builds, tests, and publishes the three attested assets: `main.js`, `manifest.json`, and `styles.css`. Include the upgrade note above and check the [public Scorecard](https://community.obsidian.md/plugins/chat-stream#scorecard) after the directory picks up the release. The current public scorecard covers 1.4.8.

## Verified in this session

- Reviewed the plugin against [Obsidian’s plugin checklist](https://docs.obsidian.md/oo/plugin) and [developer policies](https://docs.obsidian.md/community-directory/developer-policies). Confirmed the desktop manifest, command IDs, plugin settings and vault APIs, provider disclosures, and release assets. Added third-party MIT notices to the release bundle. The settings tab uses shared row definitions for search on Obsidian 1.13+ and for rendering on older versions.
- On Obsidian 1.15.1, captured both settings screenshots, added an LM Studio connection through AI Providers, and selected it in Chat Stream. The loopback server returned a reply for one model and rejected another. Chat Stream showed a notice for the rejection and added no card.
- Previewed both branches: only the left one included Field notes. Created and edited a follow-up using its assigned hotkey. After reopening the Canvas, the purple assistant card, its role, and both new edges were present. Used the Obsidian CLI to focus and select fixture cards and to invoke the preview and successful generation commands; entry and follow-up editing used the normal UI. Hosted generation was not repeated for this pass.

## Known limitations

- OpenRouter can include `<think>` blocks in saved replies. They become part of subsequent context when that reply is on the selected branch.

## Onboarding follow-ups

- Consider offering a one-click sample Canvas in the vault. Keep the current copyable sample as a fallback.
