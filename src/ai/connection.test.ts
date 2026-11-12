import { completionUrl, endpointFor, hostedProvider, sameOrigin } from './connection'

test('normalizes compatible base URLs and preserves full completion URLs', () => {
	expect(completionUrl(' https://example.test/v1/ ').href).toBe('https://example.test/v1/chat/completions')
	expect(completionUrl('http://127.0.0.1:11434/v1/chat/completions').pathname).toBe('/v1/chat/completions')
})

test('accepts keys only for the same URL origin and rejects unsafe endpoint forms', () => {
	expect(sameOrigin('https://example.test/v1', 'https://example.test/v2')).toBe(true)
	expect(sameOrigin('https://example.test/v1', 'https://example.test:9443/v1')).toBe(false)
	expect(() => completionUrl('http://example.test/v1')).toThrow('HTTPS')
	expect(() => completionUrl('https://name:password@example.test/v1')).toThrow('credentials')
	expect(() => completionUrl('https://example.test/v1?token=123')).toThrow('query')
})

test('a blank override uses the preset and a custom server uses its own origin', () => {
	const preset = endpointFor({ provider: 'openrouter', endpointOverride: '  ' })
	expect(preset.href).toBe('https://openrouter.ai/api/v1/chat/completions')
	expect(hostedProvider(preset)).toBe('openrouter')
	const override = endpointFor({ provider: 'openrouter', endpointOverride: 'http://127.0.0.1:11434/v1' })
	expect(override.href).toBe('http://127.0.0.1:11434/v1/chat/completions')
	expect(hostedProvider(override)).toBeUndefined()
	expect(sameOrigin(preset.href, override.href)).toBe(false)
})
