import { around } from "monkey-around"
import { ItemView, KeymapContext, Plugin, TFile } from 'obsidian'
import { Canvas, CanvasNode } from './obsidian/canvas-internal'
import { getChatGPTCompletion } from './openai/chatGPT'
import SettingsTab from './settings/SettingsTab'
import { DEFAULT_SETTINGS, TTSettings } from './settings/TTSettings'

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
      await this.loadSettings()
      this.addSettingTab(new SettingsTab(this.app, this))
      this.patchCanvas()
   }

   onunload() {

   }

   patchCanvas() {
      const settings = this.settings

      const patchCanvas = () => {
         const canvasView = app.workspace.getActiveViewOfType(ItemView)
         // const canvasView = app.workspace.getLeavesOfType("canvas").first()?.view
         if (!canvasView) return false

         const canvasViewUninstall = around(canvasView.constructor.prototype, {
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

                        // console.debug({ node, parents, edges: canvas.edges })

                        setTimeout(async () => {
                           const prompt = await buildPrompt(node, canvas)
                           console.debug(prompt)

                           const generated = await generate(settings, prompt)
                           appendText(node, '\n' + generated)
 
                           node.blur()
                           canvas.requestSave()
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

async function buildPrompt(node: CanvasNode, canvas: Canvas) {
   const sections: string[] = []

   const visit = async (node: CanvasNode, depth: number) => {
      if (depth <= 0) return

      const nodeText = await getNodeText(node) || ''
      sections.unshift(nodeText)

      const parents = canvas.getEdgesForNode(node)
         .filter(edge => edge.to.node.id === node.id)
         .map(edge => edge.from.node)
      for (const parent of parents) {
         await visit(parent, depth - 1)
      }
   }

   await visit(node, 4)

   return sections.join('\n\n')
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

async function generate(settings: TTSettings, prompt: string) {
   return getChatGPTCompletion(
      settings.apiKey,
      settings.apiModel,
      [
         {
            content: 'Respond thoroughly, but use brief language.',
            role: 'system'
         },
         {
            content: prompt,
            role: 'user'
         }
      ]
   )
}

async function readFile(path: string) {
   const file = this.app.vault.getAbstractFileByPath(path)
   if (file instanceof TFile) {
      const body = await app.vault.read(file)
      return `#${file.basename}\n${body}`
   }
}

async function appendFile(path: string, content: string) {
   const file = this.app.vault.getAbstractFileByPath(path)
   if (file instanceof TFile) {
      return this.app.vault.append(file, content)
   }
}
