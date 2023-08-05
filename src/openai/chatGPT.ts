import { request, RequestUrlParam } from "obsidian"
import { openai } from './chatGPT-types'

export const CHAT_MODELS = {
	GPT35: {
		name: 'gpt-3.5-turbo',
		tokenLimit: 4096,
	},
	GPT35_16K: {
		name: 'gpt-3.5-turbo-16k',
		tokenLimit: 16384,
	},
	GPT4: {
		name: 'gpt-4',
		tokenLimit: 8000,
	},
	GPT4_32K: {
		name: 'gpt-4-32k',
		tokenLimit: 32768
	}
}

export type ChatGPTModel = typeof CHAT_MODELS.GPT35 | typeof CHAT_MODELS.GPT4

export type ChatGPTModelType = keyof typeof CHAT_MODELS

export function chatModelByName(name: string) {
	return Object.values(CHAT_MODELS).find(model => model.name === name)
}

export const defaultChatGPTSettings: Partial<openai.CreateChatCompletionRequest> = {
	model: CHAT_MODELS.GPT35.name,
	max_tokens: 500,
	temperature: 0,
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
): Promise<string | undefined> {
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
	console.debug('Calling openAI', requestParam)
	const res: openai.CreateChatCompletionResponse | undefined = await request(requestParam)
		.then((response) => {
			return JSON.parse(response)
		})
		.catch((err) => {
			console.error(err)
			if (err.code === 429) {
				console.error('OpenAI API rate limit exceeded. If you have free account, your credits may have been consumed or expired.')
			}
		})
	return res?.choices?.[0]?.message?.content
}
