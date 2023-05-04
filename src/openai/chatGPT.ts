import { request, RequestUrlParam } from "obsidian"
import { openai } from './chatGPT-types'

export enum ChatGPTModelType {
   GPT35 = "gpt-3.5-turbo",
   GPT4 = "gpt-4",
}

// export type ChatRole = "user" | "system" | "assistant"

// export interface ChatMessage {
//    role: ChatRole
//    content: string
// }

// export interface ChatGPTSettings {
//    modelType: ChatGPTModelType
//    systemMessage: string
//    maxTokens: number
//    temperature: number
//    topP: number
//    presencePenalty: number
//    frequencyPenalty: number
//    stop: string[]
// }

export const defaultChatGPTSettings: Partial<openai.CreateChatCompletionRequest> = {
   model: ChatGPTModelType.GPT35.toString(),
   max_tokens: 500,
   temperature: 1.0,
   top_p: 1.0,
   presence_penalty: 0,
   frequency_penalty: 0,
   stop: [],
}

export async function getChatGPTCompletion(
   apiKey: string,
   model: openai.CreateChatCompletionRequest['model'],
   messages: openai.CreateChatCompletionRequest['messages'],
   settings?: Partial<Omit<openai.CreateChatCompletionRequest, 'messages' | 'model'>>
): Promise<string> {
   const apiUrl = `https://api.openai.com/v1/chat/completions`
   const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
   }
   const body: openai.CreateChatCompletionRequest = {
      messages,
      model,
      ...settings
   }
   const requestParam: RequestUrlParam = {
      url: apiUrl,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify(body),
      headers,
   }
   console.debug('Calling open API', requestParam)
   const res: any = await request(requestParam)
      .then((response) => {
         return JSON.parse(response)
      })
      .catch((err) => {
         console.error(err)
      })
   return res?.choices?.[0]?.message?.content
}

