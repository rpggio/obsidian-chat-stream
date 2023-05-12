import { ChatGPTModelType } from 'src/openai/chatGPT'

export interface TTSettings {
   apiKey: string
   apiModel: string
   systemPrompt: string
   debug: boolean
}

export const DEFAULT_SYSTEM_PROMPT =
`
You are a critical-thinking assistant bot. 
Consider the intent of my questions before responding.
Do not restate my information unless I ask for it. 
Do not include caveats or disclaimers.
When formatting lists, use bulleted lists (markdown dash character), not numbered lists.
Use step-by-step reasoning. Be brief.
`.trim()

export const DEFAULT_SETTINGS: TTSettings = {
   apiKey: '',
   apiModel: ChatGPTModelType.GPT35.toString(),
   systemPrompt: DEFAULT_SYSTEM_PROMPT,
   debug: false
}

export function getModels() {
   return Object.values(ChatGPTModelType)
}
