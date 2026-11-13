import {
	recommendedPluginVersionForApi, supportsVersion, waitForAI,
	type IAIProvider, type IAIProvidersService
} from '@obsidian-ai-providers/sdk'
import type { App } from 'obsidian'
import { DEFAULT_SETTINGS } from '../settings/ChatStreamSettings'
import { completeChat, getAIProviders, resolveChat } from './chat'

jest.mock('@obsidian-ai-providers/sdk', () => ({
	recommendedPluginVersionForApi: jest.fn(),
	supportsVersion: jest.fn(),
	waitForAI: jest.fn()
}))

const provider: IAIProvider = { id: 'provider', type: 'openrouter', name: 'Provider', model: 'default' }
const capabilities = { text: true, vision: false, tools: false, embedding: false, reasoningModes: ['low'] }
const execute = jest.fn().mockResolvedValue('Reply')
const ai = {
	providers: [provider],
	getModels: () => ({ other: capabilities, embeddings: { ...capabilities, text: false } }),
	getModelCapabilities: ({ model }: { model: string }) => {
		if (model === 'other') return capabilities
		if (model === 'embeddings') return { ...capabilities, text: false }
		return null
	},
	execute
} as unknown as IAIProvidersService

test('reports missing and outdated companion versions without waiting for a missing plugin', async () => {
	await expect(getAIProviders({} as App)).rejects.toThrow('Install and enable')
	expect(waitForAI).not.toHaveBeenCalled()

	const outdated = { version: 5 } as IAIProvidersService
	jest.mocked(waitForAI).mockResolvedValue({ promise: Promise.resolve(outdated), cancel: jest.fn() })
	jest.mocked(supportsVersion).mockReturnValue(false)
	jest.mocked(recommendedPluginVersionForApi).mockReturnValue('1.13.0+')
	await expect(getAIProviders({ aiProviders: outdated } as unknown as App)).rejects.toThrow('1.13.0+')
	expect(supportsVersion).toHaveBeenCalledWith(outdated, 6)
})

test('uses the provider default and rejects unavailable or non-chat selections', () => {
	const settings = { ...DEFAULT_SETTINGS, providerId: provider.id }
	expect(resolveChat(ai, settings)).toEqual({ provider, model: 'default' })
	expect(() => resolveChat(ai, { ...settings, modelId: 'embeddings' })).toThrow('available chat model')
	expect(() => resolveChat(ai, { ...settings, modelId: 'removed' })).toThrow('available chat model')
})

test('passes messages to the SDK and only sends a currently declared reasoning mode', async () => {
	const controller = new AbortController()
	const messages = [{ role: 'user' as const, content: 'Hello' }]
	const settings = { ...DEFAULT_SETTINGS, providerId: provider.id, modelId: 'other', reasoningMode: 'low' }
	const chat = resolveChat(ai, settings)
	expect(await completeChat(ai, chat, messages, settings, controller)).toBe('Reply')
	expect(execute).toHaveBeenLastCalledWith({
		provider, model: 'other', messages, abortController: controller, options: {}, reasoningMode: 'low'
	})
	for (const reasoningMode of ['', 'stale']) {
		await completeChat(ai, chat, messages, { ...settings, reasoningMode }, controller)
		expect(execute.mock.lastCall?.[0]).not.toHaveProperty('reasoningMode')
	}
})
