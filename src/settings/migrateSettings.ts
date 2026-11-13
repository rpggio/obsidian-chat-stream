import { ChatStreamSettings, DEFAULT_SETTINGS } from './ChatStreamSettings'

export function migrateSettings(data: Partial<ChatStreamSettings> | null) {
	const stored = data ?? {}
	// Copy recognized preferences only. This also removes legacy plaintext keys.
	const settings: ChatStreamSettings = {
		providerId: stored.providerId ?? DEFAULT_SETTINGS.providerId,
		modelId: stored.modelId ?? DEFAULT_SETTINGS.modelId,
		reasoningMode: stored.reasoningMode ?? DEFAULT_SETTINGS.reasoningMode,
		temperature: stored.temperature ?? DEFAULT_SETTINGS.temperature,
		systemPrompt: stored.systemPrompt ?? DEFAULT_SETTINGS.systemPrompt,
		debug: stored.debug ?? DEFAULT_SETTINGS.debug,
		maxInputTokens: stored.maxInputTokens ?? DEFAULT_SETTINGS.maxInputTokens,
		maxResponseTokens: stored.maxResponseTokens ?? DEFAULT_SETTINGS.maxResponseTokens,
		maxDepth: stored.maxDepth ?? DEFAULT_SETTINGS.maxDepth
	}
	return {
		settings,
		changed: Object.keys(stored).some(key => !Object.prototype.hasOwnProperty.call(settings, key))
	}
}
