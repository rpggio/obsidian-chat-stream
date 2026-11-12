# Chat Stream verification

Run `pnpm lint`, `pnpm test`, and `pnpm build`. Use the disposable vault setup in [CONTRIBUTING.md](CONTRIBUTING.md) for app testing.

- Preview both branches and verify that only the left branch includes Field notes.
- Generate a reply with the development-only Offline demo or the localhost stub, add a follow-up using an assigned hotkey, and reopen the canvas. Check the saved assistant role and both edges.
- For custom endpoint tests use a localhost stub and synthetic content. Verify a response and a rejected request. Use authorized test keys and synthetic content for hosted provider smoke tests.
- Keep vault state, API keys, and recordings out of Git. Target the disposable vault explicitly in Obsidian CLI commands.
