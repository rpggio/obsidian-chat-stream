import { ChatGPTModelType } from 'src/chatGPT'

export interface TTSettings {
   apiKey: string
   apiModel: string
}

export const DEFAULT_SETTINGS: TTSettings = {
   apiKey: '',
   apiModel: ChatGPTModelType.Default.toString()
}

export function getModels() {
   return Object.values(ChatGPTModelType)
}
