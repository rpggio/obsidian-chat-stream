import { around } from "monkey-around"
import { ItemView, KeymapContext, Plugin, TFile, requireApiVersion } from 'obsidian'
import { Canvas, CanvasNode } from './obsidian/canvas-internal'
import { addEdge } from './obsidian/obsidian-utils'
import { getChatGPTCompletion } from './openai/chatGPT'
import { openai } from './openai/chatGPT-types'
import SettingsTab from './settings/SettingsTab'
import { DEFAULT_SETTINGS, TTSettings } from './settings/TTSettings'
import { random } from './utils'

export interface CanvasNodeDataBase {
   id: string
}

export interface CanvasNoteData extends CanvasNodeDataBase {
   type: 'note'
   text: string
   setText(text: string): void
}

export interface CanvasFileData extends CanvasNodeDataBase {
   type: 'file'
   file: string
}

export type CanvasNodeData = CanvasFileData | CanvasNoteData

export class TTCanvasPlugin extends Plugin {
   settings: TTSettings

   async onload() {
      if (!requireApiVersion("1.1.10")) {
         console.error('Thought Thread requires Obsidian 1.1.10 or higher')
         return
      }

      await this.loadSettings()
      this.addSettingTab(new SettingsTab(this.app, this))
      this.patchCanvas()
   }

   onunload() {}

   patchCanvas() {
      const settings = this.settings

      const patchCanvas = () => {
         const canvasView = app.workspace.getActiveViewOfType(ItemView)
         // const canvasView = app.workspace.getLeavesOfType("canvas").first()?.view
         if (!canvasView) return false

         const canvasViewUninstall = around(canvasView.constructor.prototype, {
            createTextNode: (next) => {
               return function (...args: any[]) {
                  console.log('createTextNode', args)///

                  return next.call(this, ...args)
               }
            },

            onOpen: (next) => {
               return async function () {
                  if (!this.scope?.register) return

                  this.scope.register(['Meta'], "Enter", async (evt: KeyboardEvent, ctx: KeymapContext) => {
                     evt.preventDefault()

                     const canvas: Canvas = this.canvas
                     const selection = canvas.selection
                     if (selection?.size === 1) {
                        const values = Array.from(selection.values()) as any[]
                        const node = values[0]
                        if (!node) return

                        const parents = canvas.getEdgesForNode(node)
                           .map((e: any) => e.from.node)

                        // console.debug({ canvas, node, parents, edges: canvas.edges }) ///

                        setTimeout(async () => {
                           const messages = await buildMessages(node, canvas)

                           console.debug(messages)

                           const generated = await getChatGPTCompletion(
                              settings.apiKey,
                              settings.apiModel,
                              messages
                           )

                           createNode(canvas, node, generated)
                        }, 100)
                     }
                  })
                  return next.call(this)
               }
            }
         })

         this.register(canvasViewUninstall)

         const leaf = canvasView.leaf as any
         leaf.rebuildView()
         console.log("Thought Thread: canvas view patched")
         return true
      }

      this.app.workspace.onLayoutReady(() => {
         if (!patchCanvas()) {
            const evt = app.workspace.on("layout-change", () => {
               patchCanvas() && app.workspace.offref(evt)
            })
            this.registerEvent(evt)
         }
      })
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

const systemPrompt =
   `You are a thought assistant bot which helps to complete the next thought. 
Infer the reasoning behind the information you are given.
Examine it for flaws, gaps, and inconsistencies. 
You approach questions from a different angle than assumed in the prompt.
Do not re-state provided information unless asked to. 
Use step-by-step reasoning. Answer thoroughly. Use brief language.
Do not include preamble or wrap-up statements.
For lists, use bullets not numbers.
`

async function buildMessages(node: CanvasNode, canvas: Canvas) {
   const messages: openai.ChatCompletionRequestMessage[] = []

   const visit = async (node: CanvasNode, depth: number) => {
      if (depth <= 0) return

      const nodeData = node.getData()

      const nodeText = await getNodeText(node) || ''
      messages.unshift({
         content: nodeText,
         role: nodeData.chat_role || 'user'
      })

      const parents = canvas.getEdgesForNode(node)
         .filter(edge => edge.to.node.id === node.id)
         .map(edge => edge.from.node)

      for (const parent of parents) {
         await visit(parent, depth - 1)
      }
   }

   // Visit the node + 3 ancestor levels
   await visit(node, 4)

   if (!messages.length) return []

   messages.unshift({
      content: systemPrompt,
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

async function appendText(node: CanvasNode, text: string) {
   const nodeData = node.getData()
   switch (nodeData.type) {
      case 'text':
         return node.setText(node.text + text)
      case 'file':
         return appendFile(nodeData.file, text)
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

const defaultWidth = 400
const pxPerChar = 5
const pxPerLine = 28
const assistantColor = "6"
const newNoteMargin = 64

const createNode = async (canvas: any, parentNode: CanvasNode, text: string) => {
   if (!canvas || !parentNode) {
      console.error('Invalid arguments', { canvas, parentNode, text })
      return
   }

   const width = Math.max(defaultWidth, parentNode.width)
   const calcTextHeight = Math.round(12 + pxPerLine * text.length / (defaultWidth / pxPerChar))
   const height = Math.max(parentNode.height, calcTextHeight)

   const newNode = canvas.createTextNode(
      {
         pos: {
            x: parentNode.x,
            y: parentNode.y + parentNode.height + height * 0.5 + newNoteMargin
         },
         position: 'left',
         size: { height, width },
         text,
         focus: false
      }
   )
   newNode.setData({
      color: assistantColor,
      chat_role: 'assistant'
   })

   canvas.deselectAll()
   canvas.addNode(newNode)

   addEdge(canvas, random(16), {
      fromOrTo: "from",
      side: "bottom",
      node: parentNode,
   }, {
      fromOrTo: "to",
      side: "top",
      node: newNode,
   })

   canvas.selectOnly(newNode, false /* startEditing */)
   canvas.requestSave()

   return newNode
}
