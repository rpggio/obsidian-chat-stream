import { around } from "monkey-around"
import { KeymapContext, Plugin, TFile } from 'obsidian'
import { defaultChatGPTSettings, getChatGPTCompletion } from './chatGPT'

export default class ThoughtThreadCanvasPlugin extends Plugin {

   async onload() {
      console.log('ThoughtThreadCanvasPlugin.onload')
      this.patchCanvas()
   }

   onunload() {
   }

   patchCanvas() {
      const patchCanvas = () => {
         const canvasView = app.workspace.getLeavesOfType("canvas").first()?.view
         // @ts-ignore
         const canvas = canvasView?.canvas
         if (!canvasView) return false

         const canvasViewUninstall = around(canvasView.constructor.prototype, {
            onOpen: (next) => {
               return async function () {
                  this.scope.register(['Meta'], "Enter", async (evt: KeyboardEvent, ctx: KeymapContext) => {
                     const selection = this.canvas.selection
                     if (selection?.size === 1) {
                        const values = Array.from(selection.values()) as any[]
                        const node = values[0]

                        // if (!node?.isEditing) return

                        const nodeData = node?.getData()

                        if (!nodeData) return

                        if (nodeData.type === 'note') {
                           // Delay to allow last entered characters to be committed
                           setTimeout(async () => {
                              const generated = await generate(node.text)
                              node.setText(node.text + '\n' + generated)
                              node.blur()
                           }, 100)
                        } 
                        else if (nodeData.type === 'file') {
                           const content = await readFile(nodeData.file)
                           if (content){
                              const generated = await generate(content)
                              appendFile(nodeData.file, generated)
                           }
                        }
                     }
                  })
                  return next.call(this)
               }
            }
         })

         this.register(canvasViewUninstall)

         canvas?.view.leaf.rebuildView()
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
}

async function generate(prompt: string) {
   // console.log('calling GPT', prompt);
   
   return getChatGPTCompletion(
      'API-KEY',
      [{
         content: prompt,
         role: 'user'
      }],
      defaultChatGPTSettings
   )
}

async function readFile(path: string) {
   const file = app.vault.getAbstractFileByPath(path)
   if (file instanceof TFile) {
      const body = await app.vault.read(file)
      return `#${file.basename}\n${body}`
   }
}

async function appendFile(path: string, content: string) {
   const file = app.vault.getAbstractFileByPath(path)
   if (file instanceof TFile) {
      return app.vault.append(file, content)
   }
}
