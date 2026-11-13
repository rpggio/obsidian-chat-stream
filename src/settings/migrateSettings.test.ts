import { DEFAULT_SETTINGS } from './ChatStreamSettings'
import { migrateSettings } from './migrateSettings'

test('preserves Canvas preferences and removes legacy connection data', () => {
	const legacy = {
		provider: 'openai', endpointOverride: 'https://example.test', apiModel: 'legacy',
		apiKey: 'synthetic-key', secretName: 'old-secret', systemPrompt: 'Be concise.', maxDepth: 4
	}
	expect(migrateSettings(legacy)).toEqual({
		settings: { ...DEFAULT_SETTINGS, systemPrompt: 'Be concise.', maxDepth: 4 },
		changed: true
	})
})

test('keeps AI Providers selections on subsequent loads', () => {
	const settings = { ...DEFAULT_SETTINGS, providerId: 'provider', modelId: 'model', reasoningMode: 'high' }
	expect(migrateSettings(settings)).toEqual({ settings, changed: false })
	expect(migrateSettings(null)).toEqual({ settings: DEFAULT_SETTINGS, changed: false })
})
