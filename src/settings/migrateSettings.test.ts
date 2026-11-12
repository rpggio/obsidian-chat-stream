import { migrateSettings } from './migrateSettings'

function secretStorage() {
	const secrets = new Map<string, string>()
	return {
		getSecret: (name: string) => secrets.get(name) ?? null,
		setSecret: (name: string, value: string) => { secrets.set(name, value) }
	}
}

test('migrates the old credential, model and endpoint without persisting plaintext', () => {
	const storage = secretStorage()
	const data = { apiKey: 'legacy-test-key', apiModel: 'previous-model', apiUrl: 'https://example.test/api/chat/completions' }
	const { settings, changed } = migrateSettings(data, storage)
	expect(changed).toBe(true)
	expect(settings).toMatchObject({ provider: 'openai', apiModel: data.apiModel, endpointOverride: data.apiUrl })
	expect(settings).not.toHaveProperty('apiKey')
	expect(storage.getSecret(settings.secretName)).toBe(data.apiKey)
	expect(migrateSettings(data, storage).settings.secretName).toBe(settings.secretName)
})

test('keeps unrelated secrets and only drops plaintext after a verified write', () => {
	const storage = secretStorage()
	storage.setSecret('chat-stream-migrated-key', 'different-key')
	const data = { apiKey: 'legacy-test-key' }
	expect(migrateSettings(data, storage).settings.secretName).toBe('chat-stream-migrated-key-2')
	expect(storage.getSecret('chat-stream-migrated-key')).toBe('different-key')
	expect(() => migrateSettings(data, { getSecret: () => null, setSecret: () => {} })).toThrow('could not migrate')
})

test('keeps an endpoint override and linked key from an earlier custom connection', () => {
	const apiUrl = 'http://127.0.0.1:11434/v1'
	const result = migrateSettings({ provider: 'custom', apiUrl, apiModel: 'local-model', secretName: 'local-key' }, secretStorage())
	expect(result.settings).toMatchObject({ provider: 'openai', endpointOverride: apiUrl, apiModel: 'local-model', secretName: 'local-key' })
	expect(result.settings).not.toHaveProperty('apiUrl')
	expect(migrateSettings(result.settings, secretStorage()).changed).toBe(false)
})

test('moves development demo settings to a hosted preset in production only', () => {
	const stored = { provider: 'demo' as const, apiModel: '', secretName: '' }
	expect(migrateSettings(stored, secretStorage()).settings).toMatchObject({
		provider: 'openrouter', endpointOverride: '', secretName: ''
	})
	expect(migrateSettings(stored, secretStorage(), true).settings.provider).toBe('demo')
})
