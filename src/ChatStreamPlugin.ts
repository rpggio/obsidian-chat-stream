import { around } from "monkey-around"
import { ItemView, KeymapContext, Notice, Plugin, TFile, requireApiVersion } from 'obsidian'
import { AllCanvasNodeData } from 'obsidian/canvas'
import { Canvas, CanvasNode, CreateNodeOptions } from './obsidian/canvas-internal'
import { addEdge, trapError } from './obsidian/obsidian-utils'
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

   async onload() {
      if (!requireApiVersion("1.1.10")) {
         console.error('Chat Stream requires Obsidian 1.1.10 or higher')
         return
      }

      await this.loadSettings()
      this.addSettingTab(new SettingsTab(this.app, this))
      this.patchCanvas()
   }

   onunload() {
      this.unloaded = true
   }

   patchCanvas() {
      const settings = this.settings
      const logDebug = settings.debug
         ? (message?: any, ...optionalParams: any[]) => console.debug('Chat Stream: ' + message, optionalParams)
         : () => { }

      const patchCanvas = () => {
         const canvasView = app.workspace.getActiveViewOfType(ItemView)
         // const canvasView = app.workspace.getLeavesOfType("canvas").first()?.view
         if (!canvasView) return false

         const canvasViewUninstall = around(canvasView.constructor.prototype, {
            onOpen: trapError((next) => {
               return async function () {
                  if (!this.scope?.register) return

                  // Cmd+Enter to create user note
                  this.scope.register(['Meta'], "Enter", async (evt: KeyboardEvent, ctx: KeymapContext) => {
                     if (this.unloaded) return

                     evt.preventDefault()

                     logDebug("Creating user note")

                     const canvas: Canvas = this.canvas
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
                  })

                  // Shift+Cmd+Enter to create GPT note
                  this.scope.register(['Shift', 'Meta'], "Enter", async (evt: KeyboardEvent, ctx: KeymapContext) => {
                     if (this.unloaded) return

                     evt.preventDefault()

                     logDebug("Creating AI note")

                     const canvas: Canvas = this.canvas
                     await canvas.requestFrame()

                     const selection = canvas.selection
                     if (selection?.size !== 1) return
                     const values = Array.from(selection.values()) as CanvasNode[]
                     const node = values[0]

                     if (node) {
                        // Last typed characters might not be applied to note yet
                        await canvas.requestSave()
                        await sleep(200)

                        const messages = await buildMessages(node, canvas, settings, logDebug)
                        if (!messages.length) return

                        logDebug('Messages for chat API', messages)

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
                        } catch {
                           canvas.removeNode(created)
                        }

                        await canvas.requestSave()
                     }
                  })
                  return next.call(this)
               }
            })
         })

         this.register(canvasViewUninstall)

         const leaf = canvasView.leaf as any
         leaf.rebuildView()
         console.log("Chat Stream: canvas view patched")
         return true
      }

      this.app.workspace.onLayoutReady(trapError(() => {
         if (!patchCanvas()) {
            const evt = app.workspace.on("layout-change", () => {
               patchCanvas() && app.workspace.offref(evt)
            })
            this.registerEvent(evt)
         }
      }))
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

async function buildMessages(node: CanvasNode, canvas: Canvas, settings: ChatStreamSettings, logDebug: (...args: any[]) => void) {
   const messages: openai.ChatCompletionRequestMessage[] = []
   const ancestorVisitDepth = 5
   let totalLength = 0

   const visit = async (node: CanvasNode, depth: number) => {
      if (depth <= 0) return

      const nodeData = node.getData()
      let nodeText = await getNodeText(node) || ''
      const lengthLimit = settings.maxInputCharacters || DEFAULT_SETTINGS.maxInputCharacters

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

         messages.unshift({
            content: nodeText,
            role: nodeData.chat_role === 'assistant' ? 'assistant' : 'user'
         })
      }

      if (totalLength >= lengthLimit) {
         return
      }

      const parents = canvas.getEdgesForNode(node)
         .filter(edge => edge.to.node.id === node.id)
         .map(edge => edge.from.node)

      for (const parent of parents) {
         await visit(parent, depth - 1)
      }
   }

   await visit(node, ancestorVisitDepth + 1)

   if (!messages.length) return []

   messages.unshift({
      content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      role: 'system'
   })

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

async function appendFile(path: string, content: string) {
   const file = this.app.vault.getAbstractFileByPath(path)
   if (file instanceof TFile) {
      return this.app.vault.append(file, content)
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
