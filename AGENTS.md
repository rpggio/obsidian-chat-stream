# Chat Stream verification

Run `pnpm lint`, `pnpm test`, and `pnpm build`. Use the user-installed Obsidian at `/Users/dev/Applications/Obsidian.app` and the disposable vault setup in [CONTRIBUTING.md](CONTRIBUTING.md) for app testing. Use the normal settings, Canvas controls, and commands. Report any workaround and which user flows it leaves unverified. If testing another Obsidian version, identify its process separately and close it after the test.

- Start with no provider configured and follow the setup instructions. Add a connection through AI Providers settings and select it in Chat Stream.
- Preview both branches and verify that only the left branch includes Field notes.
- Generate a reply with AI Providers pointed at a localhost stub, add a follow-up using an assigned hotkey, and reopen the canvas. Check the saved assistant role and both edges.
- For endpoint tests use synthetic content. Verify a response and a rejected request. Use authorized test keys and synthetic content for hosted provider smoke tests.
- Keep vault state, API keys, and recordings out of Git. Target the disposable vault explicitly in Obsidian CLI commands.

## Obsidian CLI

Use the official CLI bundled with the user-installed Obsidian. Enable it in **Settings → General → Command line interface**. On this host, `~/.local/bin/obsidian` points to the bundled executable. See the [Obsidian CLI reference](https://obsidian.md/help/cli).

- Check the running version with `obsidian vault=chat-stream-demo version` and open a fixture with `obsidian vault=chat-stream-demo open 'path=Weekend plan.canvas'`.
- After copying a new build, run `obsidian vault=chat-stream-demo plugin:reload id=chat-stream`. Use `commands filter=chat-stream` to find command IDs and `command id=chat-stream:preview-context` to run a command on the selected card.
- Use `eval` for targeted inspection or repeatable tests on synthetic data in the disposable vault. Report when it substitutes for a UI action. Keep credentials, live vault state, generated fixtures used once, and recordings outside the repository.
