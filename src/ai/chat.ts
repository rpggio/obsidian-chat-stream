import { App, requestUrl } from 'obsidian'
import { ConnectionSettings, endpointFor, hostedProvider, PROVIDERS } from './connection'

export type ChatMessage = {
	role: 'user' | 'assistant' | 'system'
	content: string | { type: 'image_url'; image_url: { url: string } }[]
}

export type ChatOptions = { maxResponseTokens?: number; temperature?: number }

export type ChatConnection =
	| { kind: 'demo'; destination: string }
	| { kind: 'remote'; destination: string; url: string; model: string; key?: string; useMaxCompletionTokens: boolean }

export function getConnection(app: App, settings: ConnectionSettings): ChatConnection {
	if (CHAT_STREAM_DEV && settings.provider === 'demo') return { kind: 'demo', destination: 'Offline demo' }
	const url = endpointFor(settings)
	const model = settings.apiModel.trim()
	if (!model) throw new Error('Enter a model ID in Chat Stream settings.')
	const key = settings.secretName ? app.secretStorage.getSecret(settings.secretName)?.trim() : undefined
	if (settings.secretName && !key) {
		throw new Error('The selected secret is missing on this device. Choose an API key in Chat Stream settings.')
	}
	const provider = hostedProvider(url)
	if (provider && !key) {
		throw new Error(`Choose an API key for ${PROVIDERS[provider].label} in Chat Stream settings.`)
	}
	return {
		kind: 'remote',
		destination: url.host,
		url: url.href,
		model,
		key,
		useMaxCompletionTokens: provider !== undefined
	}
}

export async function completeChat(connection: ChatConnection, messages: ChatMessage[], options: ChatOptions = {}) {
	if (CHAT_STREAM_DEV && connection.kind === 'demo') {
		const prompt = messages.slice().reverse().find(message => message.role === 'user')?.content
		const excerpt = typeof prompt === 'string' ? prompt.trim().slice(0, 120) : ''
		return [
			'**Offline demo · sample reply**',
			excerpt ? `You asked: “${excerpt}”` : 'Your selected card is ready to branch.',
			'Create a follow-up card from here, or select an earlier card to start another branch.'
		].join('\n\n')
	}

	if (connection.kind !== 'remote') throw new Error('Choose an AI provider in Chat Stream settings.')
	const limitField = connection.useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens'
	const body = {
		model: connection.model,
		messages,
		[limitField]: options.maxResponseTokens || undefined,
		temperature: options.temperature
	}
	let response
	try {
		response = await requestUrl({
			url: connection.url,
			method: 'POST',
			contentType: 'application/json',
			headers: connection.key ? { Authorization: `Bearer ${connection.key}` } : undefined,
			body: JSON.stringify(body),
			throw: false
		})
	} catch {
		throw new Error(`Could not reach ${connection.destination}. Check the URL and your connection.`)
	}
	if (response.status < 200 || response.status >= 300) {
		throw new Error(responseError(response.status, connection.destination))
	}

	let result: { choices?: { message?: { content?: unknown } }[] } | null
	try {
		result = JSON.parse(response.text) as typeof result
	} catch {
		throw new Error(`${connection.destination} returned unreadable data. Check the endpoint URL.`)
	}
	const content = result?.choices?.[0]?.message?.content
	if (typeof content !== 'string' || !content.trim()) {
		throw new Error(`${connection.destination} returned no reply. Check that the model supports chat and the selected input.`)
	}
	return content
}

function responseError(status: number, host: string): string {
	switch (status) {
		case 401:
		case 403:
			return `${host} rejected access (HTTP ${status}). Check the API key and model permissions.`
		case 402:
		case 429:
			return `${host} reached a billing, quota, or rate limit (HTTP ${status}). Check your provider account.`
		case 404:
			return `${host} could not find the endpoint or model (HTTP 404). Check the URL and model ID.`
		case 400:
		case 422:
			return `${host} rejected the request (HTTP ${status}). Check the model ID and generation settings.`
		default:
			return `${host} returned HTTP ${status}. Try again or check the provider status.`
	}
}
