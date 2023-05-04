import { ChatGPTModelType } from 'src/openai/chatGPT'

export interface TTSettings {
   apiKey: string
   apiModel: string
}

export const DEFAULT_SETTINGS: TTSettings = {
   apiKey: '',
   apiModel: ChatGPTModelType.GPT35.toString()
}

export function getModels() {
   return Object.values(ChatGPTModelType)
}
