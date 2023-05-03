import { ChatGPTModelType } from 'src/chatGPT'

export interface ThoughtThreadPluginSettings {
   apiKey: string
   apiModel: string
}

export const DEFAULT_SETTINGS: ThoughtThreadPluginSettings = {
   apiKey: '',
   apiModel: ChatGPTModelType.Default.toString()
}

export function getModels() {
   return Object.values(ChatGPTModelType)
}
