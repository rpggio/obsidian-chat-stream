import { around } from "monkey-around"
import { ItemView, KeymapContext, Plugin, TFile, requireApiVersion } from 'obsidian'
import { AllCanvasNodeData } from 'obsidian/canvas'
import { Canvas, CanvasNode, CreateNodeOptions } from './obsidian/canvas-internal'
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
         console.error('Chat Stream requires Obsidian 1.1.10 or higher')
         return
      }

      await this.loadSettings()
      this.addSettingTab(new SettingsTab(this.app, this))
      this.patchCanvas()
   }

   onunload() { }

   patchCanvas() {
      const settings = this.settings

      const patchCanvas = () => {
         const canvasView = app.workspace.getActiveViewOfType(ItemView)
         // const canvasView = app.workspace.getLeavesOfType("canvas").first()?.view
         if (!canvasView) return false

         const canvasViewUninstall = around(canvasView.constructor.prototype, {
            createTextNode: (next) => {
               return function (...args: any[]) {
                  return next.call(this, ...args)
               }
            },

            onOpen: (next) => {
               return async function () {
                  if (!this.scope?.register) return

                  this.scope.register(['Meta'], "Enter", async (evt: KeyboardEvent, ctx: KeymapContext) => {
                     evt.preventDefault()

                     const canvas: Canvas = this.canvas
                     await canvas.requestFrame()

                     const selection = canvas.selection
                     if (selection?.size !== 1) return
                     const values = Array.from(selection.values()) as CanvasNode[]
                     const node = values[0]

                     // console.debug({ canvas, node, parents, edges: canvas.edges }) ///

                     if (node) {
                        if (node.getData().chat_role === 'assistant') {
                           const created = createNode(canvas, node, { text: '', size: { height: 64 } })
                           canvas.selectOnly(created, true /* startEditing */)
                           await canvas.requestSave()
                           await sleep(0)
                           created.startEditing()
                        } else {
                           // Last typed characters might not be applied to note yet
                           await sleep(500)

                           const parents = canvas.getEdgesForNode(node)
                              .map((e: any) => e.from.node)

                           const messages = await buildMessages(node, canvas)
                           if (!messages.length) return

                           // node.containerEl.addClasses(['loading', 'time'])

                           console.debug(messages)

                           const generated = await getChatGPTCompletion(
                              settings.apiKey,
                              settings.apiModel,
                              messages
                           )

                           const created = createNode(canvas, node,
                              { text: generated },
                              {
                                 color: assistantColor,
                                 chat_role: 'assistant'
                              })
                           canvas.selectOnly(created, false /* startEditing */)
                           await canvas.requestSave()
                        }
                     }
                  })
                  return next.call(this)
               }
            }
         })

         this.register(canvasViewUninstall)

         const leaf = canvasView.leaf as any
         leaf.rebuildView()
         console.log("Chat Stream: canvas view patched")
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
   `You are a sound-boarding and critical analysis bot. 
Think about the unstated intent behind the requests I provide.
Examine my comments for flaws, gaps, and inconsistencies. 
Do not take my requests literally. Think about the best approach for responding.
Do not restate my information unless I ask for it. 
Do not include caveats or disclaimers.
When formatting lists, use bullets not numbers.
Use step-by-step reasoning. Be brief.
`

async function buildMessages(node: CanvasNode, canvas: Canvas) {
   const messages: openai.ChatCompletionRequestMessage[] = []
   const lengthLimit = 5000
   let totalLength = 0

   const visit = async (node: CanvasNode, depth: number) => {
      if (depth <= 0) return

      const nodeData = node.getData()
      const nodeText = await getNodeText(node) || ''

      const textLength = nodeText.length
      if (totalLength + textLength > lengthLimit) return
      totalLength += textLength

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
   await visit(node, 6)

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

const minWidth = 450
const pxPerChar = 5
const pxPerLine = 28
const assistantColor = "6"
const newNoteMargin = 64

const createNode = (
   canvas: Canvas,
   parentNode: CanvasNode,
   nodeOptions: CreateNodeOptions,
   nodeData?: Partial<AllCanvasNodeData>
) => {
   if (!canvas || !parentNode) {
      throw new Error('Invalid arguments')
   }

   const { text } = nodeOptions
   const width = nodeOptions?.size?.width || Math.max(minWidth, parentNode.width)
   const calcTextHeight = Math.round(12 + pxPerLine * text.length / (minWidth / pxPerChar))
   const height = nodeOptions?.size?.height || Math.max(parentNode.height, calcTextHeight)

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

   if (nodeData) {
      newNode.setData(nodeData)
   }

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

   return newNode
}
