import { around } from "monkey-around"
import { KeymapContext, Plugin, TFile } from 'obsidian'
import { ChatGPTModelType, defaultChatGPTSettings, getChatGPTCompletion } from './chatGPT'
import LocalSettingsTab from './settings/LocalSettingsTab'
import { DEFAULT_SETTINGS, ThoughtThreadPluginSettings } from './settings/PluginSettings'

export class ThoughtThreadCanvasPlugin extends Plugin {
   settings: ThoughtThreadPluginSettings

   async onload() {
      await this.loadSettings()
      console.log('settings', this.settings)///
      this.addSettingTab(new LocalSettingsTab(this.app, this))

      this.patchCanvas()
   }

   onunload() {

   }

   patchCanvas() {
      const settings = this.settings

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
                              const generated = await generate(settings, node.text)
                              node.setText(node.text + '\n' + generated)
                              node.blur()
                           }, 100)
                        }
                        else if (nodeData.type === 'file') {
                           const content = await readFile(nodeData.file)
                           if (content) {
                              const generated = await generate(settings, content)
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


async function generate(settings: ThoughtThreadPluginSettings, prompt: string) {
   // console.log('calling GPT', prompt);

   return getChatGPTCompletion(
      settings.apiKey,
      [{
         content: prompt,
         role: 'user'
      }],
      {
         ...defaultChatGPTSettings,
         modelType: settings.apiModel as ChatGPTModelType
      }

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
