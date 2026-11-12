export const PROVIDERS = {
	openrouter: { label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-5.6-luna' },
	openai: { label: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5.6-luna' }
} as const

export type Provider = keyof typeof PROVIDERS | 'demo'

export interface ConnectionSettings {
	provider: Provider
	endpointOverride: string
	apiModel: string
	secretName: string
}

export function completionUrl(value: string): URL {
	let url: URL
	try {
		url = new URL(value.trim())
	} catch {
		throw new Error('Enter a valid endpoint URL in Chat Stream settings.')
	}
	const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
		throw new Error('Use HTTPS for remote endpoints. HTTP is available for localhost.')
	}
	if (url.username || url.password || url.search || url.hash) {
		throw new Error('Use an endpoint URL without credentials, query parameters, or fragments.')
	}
	url.pathname = url.pathname.replace(/\/+$/, '')
	if (!url.pathname.endsWith('/chat/completions')) {
		url.pathname += '/chat/completions'
	}
	return url
}

export function endpointValue(settings: Pick<ConnectionSettings, 'endpointOverride' | 'provider'>): string {
	if (settings.provider === 'demo') throw new Error('Choose an AI provider in Chat Stream settings.')
	return settings.endpointOverride.trim() || PROVIDERS[settings.provider].endpoint
}

export function endpointFor(settings: Pick<ConnectionSettings, 'endpointOverride' | 'provider'>): URL {
	return completionUrl(endpointValue(settings))
}

export function hostedProvider(url: URL): keyof typeof PROVIDERS | undefined {
	if (url.origin === new URL(PROVIDERS.openai.endpoint).origin) return 'openai'
	if (url.origin === new URL(PROVIDERS.openrouter.endpoint).origin) return 'openrouter'
}

export function sameOrigin(previous: string, next: string): boolean {
	try {
		return completionUrl(previous).origin === completionUrl(next).origin
	} catch {
		return false
	}
}

export function providerForLegacyUrl(value: string): keyof typeof PROVIDERS {
	try {
		return hostedProvider(completionUrl(value)) ?? 'openai'
	} catch {
		return 'openai'
	}
}
