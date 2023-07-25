import { ItemView, Notice, Plugin, TFile } from 'obsidian'
import { AllCanvasNodeData } from 'obsidian/canvas'
import { Canvas, CanvasNode, CreateNodeOptions } from './obsidian/canvas-internal'
import { CanvasView, addEdge } from './obsidian/obsidian-utils'
import { getChatGPTCompletion } from './openai/chatGPT'
import { openai } from './openai/chatGPT-types'
import { ChatStreamSettings, DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT } from './settings/ChatStreamSettings'
import SettingsTab from './settings/SettingsTab'
import { randomHexString } from './utils'

const minWidth = 360
const pxPerChar = 5
const pxPerLine = 28
// 6 == purple
const assistantColor = "6"
const newNoteMargin = 60
const minHeight = 60

export class ChatStreamPlugin extends Plugin {
   unloaded = false
   settings: ChatStreamSettings
   logDebug: (...args: unknown[]) => void = () => { }

   async onload() {
      await this.loadSettings()

      this.logDebug = this.settings.debug
         ? (message?: unknown, ...optionalParams: unknown[]) => console.debug('Chat Stream: ' + message, ...optionalParams)
         : () => { }

      this.addSettingTab(new SettingsTab(this.app, this))

      this.addCommand({
         id: 'next-note',
         name: 'Create next note',
         callback: () => {
            this.nextNote()
         },
         hotkeys: [
            {
               modifiers: ['Alt', 'Shift'],
               key: "N",
            },
         ],
      })

      this.addCommand({
         id: 'generate-note',
         name: 'Generate AI note',
         callback: () => {
            this.generateNote()
         },
         hotkeys: [
            {
               modifiers: ['Alt', 'Shift'],
               key: "G",
            },
         ],
      })

   }

   onunload() {
      this.unloaded = true
   }

   async nextNote() {
      if (this.unloaded) return

      this.logDebug("Creating user note")

      const canvas = this.getActiveCanvas()
      if (!canvas) {
         this.logDebug('No active canvas')
         return
      }

      await canvas.requestFrame()

      const selection = canvas.selection
      if (selection?.size !== 1) return
      const values = Array.from(selection.values()) as CanvasNode[]
      const node = values[0]

      if (node) {
         const created = createNode(canvas, node, { text: '', size: { height: 100 } })
         canvas.selectOnly(created, true /* startEditing */)

         // startEditing() doesn't work if called immediately
         await canvas.requestSave()
         await sleep(0)

         created.startEditing()
      }
   }

   async generateNote() {
      if (this.unloaded) return

      if (!this.canCallAI()) return

      this.logDebug("Creating AI note")

      const canvas = this.getActiveCanvas()
      if (!canvas) {
         this.logDebug('No active canvas')
         return
      }

      await canvas.requestFrame()

      const selection = canvas.selection
      if (selection?.size !== 1) return
      const values = Array.from(selection.values()) as CanvasNode[]
      const node = values[0]

      if (node) {
         // Last typed characters might not be applied to note yet
         await canvas.requestSave()
         await sleep(200)

         const settings = this.settings
         const messages = await buildMessages(node, canvas, settings, this.logDebug)
         if (!messages.length) return

         this.logDebug('Messages for chat API', messages)

         const created = createNode(canvas, node,
            {
               text: `Calling GPT (${settings.apiModel})...`,
               size: { height: 60 }
            },
            {
               color: assistantColor,
               chat_role: 'assistant'
            })

         new Notice(`Sending ${messages.length} notes to GPT`)

         try {
            const generated = await getChatGPTCompletion(
               settings.apiKey,
               settings.apiModel,
               messages,
               {
                  max_tokens: settings.maxResponseTokens || undefined,
               }
            )
            created.setText(generated)
            const height = calcHeight({ text: generated, parentHeight: node.height })
            created.moveAndResize({ height, width: created.width, x: created.x, y: created.y })
            canvas.selectOnly(created, false /* startEditing */)
         } catch (error) {
            new Notice(`Error calling GPT: ${error.message || error}`)
            canvas.removeNode(created)
         }

         await canvas.requestSave()
      }
   }

   getActiveCanvas() {
      const maybeCanvasView = app.workspace.getActiveViewOfType(ItemView) as CanvasView | null
      return maybeCanvasView ? maybeCanvasView['canvas'] : null
   }

   canCallAI() {
      if (!this.settings.apiKey) {
         new Notice('Please set your OpenAI API key in the plugin settings')
         return false
      }

      return true
   }

   async loadSettings() {
      this.settings = Object.assign(
         {},
         DEFAULT_SETTINGS,
         await this.loadData()
      )
   }

   async saveSettings() {
      await this.saveData(this.settings)
   }
}

async function buildMessages(node: CanvasNode, canvas: Canvas, settings: ChatStreamSettings, logDebug: (...args: unknown[]) => void) {
   const messages: openai.ChatCompletionRequestMessage[] = []

   let totalLength = 0

   const visit = async (node: CanvasNode, depth: number) => {
      if (settings.maxDepth && depth > settings.maxDepth) return

      // TODO: vary max input chars by model type: 4 chars per token

      const nodeData = node.getData()
      let nodeText = await getNodeText(node) || ''
      const lengthLimit = settings.maxInputCharacters || DEFAULT_SETTINGS.maxInputCharacters

      const parents = canvas.getEdgesForNode(node)
         .filter(edge => edge.to.node.id === node.id)
         .map(edge => edge.from.node)

      if (nodeText.trim()) {
         let textLength = nodeText.length
         if (totalLength + textLength > lengthLimit) {
            const truncatedLength = lengthLimit - totalLength
            logDebug(`Truncating node text from ${nodeText.length} to ${truncatedLength} characters`)

            // truncate beginning of text
            nodeText = nodeText.slice(nodeText.length - truncatedLength)
            textLength = truncatedLength
         }
         totalLength += textLength

         let role: openai.ChatCompletionRequestMessageRoleEnum = nodeData.chat_role === 'assistant' ? 'assistant' : 'user'
         if (parents.length === 0 && nodeText.startsWith('SYSTEM PROMPT')) {
            nodeText = nodeText.slice('SYSTEM PROMPT'.length).trim()
            role = 'system'
         }

         messages.unshift({
            content: nodeText,
            role
         })
      }

      if (totalLength >= lengthLimit) {
         return
      }

      for (const parent of parents) {
         await visit(parent, depth + 1)
      }
   }

   await visit(node, 0)

   if (!messages.length) return []

   if (messages[0].role !== 'system') {
      messages.unshift({
         content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
         role: 'system'
      })
   }

   return messages
}

async function getNodeText(node: CanvasNode) {
   const nodeData = node.getData()
   switch (nodeData.type) {
      case 'text':
         return nodeData.text
      case 'file':
         return readFile(nodeData.file)
   }
}

async function readFile(path: string) {
   const file = this.app.vault.getAbstractFileByPath(path)
   if (file instanceof TFile) {
      const body = await app.vault.read(file)
      return `## ${file.basename}\n${body}`
   }
}

const calcHeight = (options: { parentHeight: number, text: string }) => {
   const calcTextHeight = Math.round(12 + pxPerLine * options.text.length / (minWidth / pxPerChar))
   return Math.max(options.parentHeight, calcTextHeight)
}

const createNode = (
   canvas: Canvas,
   parentNode: CanvasNode,
   nodeOptions: CreateNodeOptions,
   nodeData?: Partial<AllCanvasNodeData>
) => {
   if (!canvas) {
      throw new Error('Invalid arguments')
   }

   const { text } = nodeOptions
   const width = nodeOptions?.size?.width || Math.max(minWidth, parentNode?.width)
   const height = nodeOptions?.size?.height
      || Math.max(minHeight, (parentNode && calcHeight({ text, parentHeight: parentNode.height })))

   const siblings = parent && canvas.getEdgesForNode(parentNode)
      .filter(n => n.from.node.id == parentNode.id)
      .map(e => e.to.node)
   const siblingsRight = siblings && siblings.reduce((right, sib) => Math.max(right, sib.x + sib.width), 0)
   const priorSibling = siblings[siblings.length - 1]

   // Position left at right of prior sibling, otherwise aligned with parent
   const x = siblingsRight ? siblingsRight + newNoteMargin : parentNode.x

   // Position top at prior sibling top, otherwise offset below parent
   const y = (priorSibling
      ? priorSibling.y
      : (parentNode.y + parentNode.height + newNoteMargin))
      // Using position=left, y value is treated as vertical center
      + height * 0.5

   const newNode = canvas.createTextNode(
      {
         pos: { x, y },
         position: 'left',
         size: { height, width },
         text,
         focus: false
      }
   )

   if (nodeData) {
      newNode.setData(nodeData)
   }

   canvas.deselectAll()
   canvas.addNode(newNode)

   addEdge(canvas, randomHexString(16), {
      fromOrTo: "from",
      side: "bottom",
      node: parentNode,
   }, {
      fromOrTo: "to",
      side: "top",
      node: newNode,
   })

   return newNode
}
