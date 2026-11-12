import { ConnectionSettings, PROVIDERS } from '../ai/connection'

export interface ChatStreamSettings extends ConnectionSettings {
	temperature: number | null
	systemPrompt: string
	debug: boolean
	maxInputTokens: number
	maxResponseTokens: number
	maxDepth: number
}

export const DEFAULT_SETTINGS: ChatStreamSettings = {
	provider: 'openrouter',
	endpointOverride: '',
	apiModel: PROVIDERS.openrouter.model,
	secretName: '',
	temperature: null,
	systemPrompt: 'Help the user think through their question. Be brief.',
	debug: false,
	maxInputTokens: 0,
	maxResponseTokens: 0,
	maxDepth: 0
}
