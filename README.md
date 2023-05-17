# Obsidian Chat Stream

An Obsidian plugin for conversing with GPT AI via canvas notes. Ancestor notes/files are included in the chat context.

<img src="static/chat-stream-usage-haiku.gif"/>

## Install

Chat Stream is supported only on desktop.

### From BRAT

Add `rpggio/obsidian-chat-stream` to BRAT.
Note: you may need to re-open canvas documents after installation.

### Download Manually

Download the latest release. Extract and put the three files (main.js, manifest.json, styles.css) to
folder `{{obsidian_vault}}/.obsidian/plugins/obsidian-chat-stream`.

## Usage

1. Select a note in the canvas
2. Press Shift+Command+Enter to send current note and ancestors to GPT
3. GPT chat will respond in a child note
4. To quickly create an empty child note for responding, press Command+Enter.

AI notes are colored purple, and tagged with `chat_role=assistant` in the canvas data file.

## Say thanks

If you love it you can send me a [coffee thumbs-up](https://bmc.link/ryanp) so I know folks find it useful.

<a href="https://bmc.link/ryanp"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=&button_colour=6495ED&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"></a>
