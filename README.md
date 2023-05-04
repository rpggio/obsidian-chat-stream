# Obsidian Thought Thread Plugin

A canvas plugin for using GPT AI completion with threads of canvas cards/notes. Title and content is used as prompt. Canvas parent notes are sent as prompt context as well.
This enables you to build reasoning threads in the canvas, and use GPT to respond to a thread, including the relevant upstream information for context.

## Install

### From BRAT

Add `rpggio/obsidian-thought-thread` to BRAT.

### Download Manually

Download the latest release. Extract and put the three files (main.js, manifest.json, styles.css) to
folder `{{obsidian_vault}}/.obsidian/plugins/rpggio/obsidian-thought-thread`.

## Usage

1. Select a note in the canvas
2. Press Command-Enter (Mac), or Win-Enter (Windows)
3. Response from OpenAI chat API will be appended to the card or note

For example, you could pose a question in the note title, or first line of a card. GPT will answer the question, using canvas parent nodes to supply the context.
