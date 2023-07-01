import { CHAT_MODELS } from 'src/openai/chatGPT'

export interface ChatStreamSettings {
   /**
    * The API key to use when making requests
    */
   apiKey: string

   /**
    * The GPT model to use
    */
   apiModel: string

   /**
    * The system prompt sent with each request to the API
    */
   systemPrompt: string

   /**
    * Enable debug output in the console
    */
   debug: boolean
   
   /**
    * The maximum number of characters to send to the API (includes system prompt)
    */
   maxInputCharacters: number

   /**
    * The maximum number of _tokens_ to return from the API. 0 means no limit. (A token is about 4 characters).
    */
   maxResponseTokens: number

   /**
    * The maximum depth of ancestor notes to include. 0 means no limit.
    */
   maxDepth: number
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

export const DEFAULT_SETTINGS: ChatStreamSettings = {
   apiKey: '',
   apiModel: CHAT_MODELS.GPT35.name,
   systemPrompt: DEFAULT_SYSTEM_PROMPT,
   debug: false,
   maxInputCharacters: 5000,
   maxResponseTokens: 0,
   maxDepth: 0
}

export function getModels() {
   return Object.entries(CHAT_MODELS).map(([, value]) => value.name)
}
