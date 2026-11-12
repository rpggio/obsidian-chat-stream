import { SecretStorage } from 'obsidian'
import { providerForLegacyUrl, PROVIDERS } from '../ai/connection'
import { ChatStreamSettings, DEFAULT_SETTINGS } from './ChatStreamSettings'

export type StoredSettings = Omit<Partial<ChatStreamSettings>, 'provider'> & {
	provider?: ChatStreamSettings['provider'] | 'custom'
	apiKey?: string
	apiUrl?: string
}

export function migrateSettings(
	data: StoredSettings | null,
	storage: Pick<SecretStorage, 'getSecret' | 'setSecret'>,
	allowDemo = typeof CHAT_STREAM_DEV !== 'undefined' && CHAT_STREAM_DEV
) {
	const { apiKey, apiUrl, provider, ...stored } = data ?? {}
	const settings: ChatStreamSettings = { ...DEFAULT_SETTINGS, ...stored }
	const legacy = data !== null && !provider
	const removedDemo = provider === 'demo' && !allowDemo
	if (legacy || provider === 'custom') {
		settings.provider = providerForLegacyUrl(apiUrl ?? '')
		settings.endpointOverride = apiUrl?.trim() || ''
		settings.apiModel = stored.apiModel ?? PROVIDERS[settings.provider].model
	} else if (removedDemo) {
		Object.assign(settings, {
			provider: DEFAULT_SETTINGS.provider,
			endpointOverride: '',
			apiModel: DEFAULT_SETTINGS.apiModel,
			secretName: ''
		})
	} else if (provider) {
		settings.provider = provider
	}
	if (apiKey?.trim() && !settings.secretName) {
		const key = apiKey.trim()
		let name = 'chat-stream-migrated-key'
		for (let suffix = 2; ; suffix++) {
			const existing = storage.getSecret(name)
			if (existing === key) break
			if (existing === null) {
				storage.setSecret(name, key)
				break
			}
			name = `chat-stream-migrated-key-${suffix}`
		}
		if (storage.getSecret(name) !== key) throw new Error('Chat Stream could not migrate the API key to Obsidian Secret Storage.')
		settings.secretName = name
	}
	return { settings, changed: legacy || removedDemo || provider === 'custom' || apiUrl !== undefined || apiKey !== undefined }
}
