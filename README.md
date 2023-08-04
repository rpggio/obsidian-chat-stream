# Chat Stream 	🔀
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/rpggio/obsidian-chat-stream?style=for-the-badge&sort=semver) [![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22chat-stream%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=for-the-badge)](https://obsidian.md/plugins?search=chat%20stream)

An Obsidian plugin for conversing with GPT AI via canvas notes. Ancestor notes/files are included in the chat context. You can quickly create chat streams, and control what other notes are sent to the AI.

<img src="static/chat-stream-example.gif"/>

## Install

Install as [community plugin](https://obsidian.md/plugins?search=chat%20stream#)

Or, add `rpggio/obsidian-chat-stream` to [BRAT](https://github.com/TfTHacker/obsidian42-brat).

Chat Stream is supported only on desktop.

## Setup

Add an [OpenAI API key](https://platform.openai.com/account/api-keys) in Chat Stream settings.

## Usage

1. Select a note in the canvas
2. Press Alt+Shift+G to generate new note from GPT using current note + ancestors
3. To create next note for responding, press Alt+Shift+N.

AI notes are colored purple, and tagged with `chat_role=assistant` in the canvas data file.

## Development

1. Download source and install dependencies
   ```
	pnpm install
	```
2. In Obsidian, install and enable [hot reload plugin](https://github.com/pjeby/hot-reload)
3. Create symbolic link from this project dir to an Obsidian store 
   ```
	ln -s . your-obsidian-store/.obsidian/plugins/chat-stream
	```
4. Start dev server
	```
	pnpm run dev
	```
5. In Obsidian, enable Chat Stream Plugin and add OpenAI key in plugin settings.

Changes to code should automatically be loaded into Obsidian.

## Attribution

* Canvas plugin code from [Canvas MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap)

## Say thanks

If you love it you can send me a [coffee thumbs-up](https://bmc.link/ryanp) so I know folks find it useful.

<a href="https://www.buymeacoffee.com/ryanp"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=ryanp&button_colour=FFDD00&font_colour=000000&font_family=Lato&outline_colour=000000&coffee_colour=ffffff" /></a>
