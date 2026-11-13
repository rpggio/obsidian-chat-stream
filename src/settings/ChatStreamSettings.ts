export interface ChatStreamSettings {
	providerId: string
	modelId: string
	reasoningMode: string
	temperature: number | null
	systemPrompt: string
	debug: boolean
	maxInputTokens: number
	maxResponseTokens: number
	maxDepth: number
}

export const DEFAULT_SETTINGS: ChatStreamSettings = {
	providerId: '',
	modelId: '',
	reasoningMode: '',
	temperature: null,
	systemPrompt: 'Help the user think through their question. Be brief.',
	debug: false,
	maxInputTokens: 0,
	maxResponseTokens: 0,
	maxDepth: 0
}
