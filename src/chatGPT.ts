import { request, RequestUrlParam } from "obsidian"
import { pythonifyKeys } from "./objectUtil"

export enum ChatGPTModelType {
   Default = "gpt-3.5-turbo",
   GPT4 = "gpt-4",
}

export type ChatRole = "user" | "system" | "assistant"

export interface ChatMessage {
   role: ChatRole
   content: string
}

export interface ChatGPTSettings {
   modelType: ChatGPTModelType
   systemMessage: string
   maxTokens: number
   temperature: number
   topP: number
   presencePenalty: number
   frequencyPenalty: number
   stop: string[]
}

export const defaultChatGPTSettings: ChatGPTSettings = {
   modelType: ChatGPTModelType.Default,
   systemMessage:
      "You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.",
   maxTokens: 200,
   temperature: 1.0,
   topP: 1.0,
   presencePenalty: 0,
   frequencyPenalty: 0,
   stop: [],
}

export const getChatGPTCompletion = async (
   apiKey: string,
   messages: ChatMessage[],
   settings: ChatGPTSettings,
   suffix?: string
): Promise<string> => {
   const apiUrl = `https://api.openai.com/v1/chat/completions`
   const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
   }
   const { modelType, systemMessage, ...params } = settings
   let body = {
      messages,
      model: modelType,
      ...pythonifyKeys(params),
      stop: settings.stop.length > 0 ? settings.stop : undefined,
      suffix: suffix ? suffix : undefined,
   }
   console.log(body)
   const requestParam: RequestUrlParam = {
      url: apiUrl,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify(body),
      headers,
   }
   const res: any = await request(requestParam)
      .then((response) => {
         return JSON.parse(response)
      })
      .catch((err) => {
         console.error(err)
      })
   return res?.choices?.[0]?.message?.content
}
