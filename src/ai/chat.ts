import {
	recommendedPluginVersionForApi, supportsVersion, waitForAI,
	type IAIProvider, type IAIProvidersService, type IChatMessage
} from '@obsidian-ai-providers/sdk'
import type { App } from 'obsidian'
import type { ChatStreamSettings } from '../settings/ChatStreamSettings'

const requiredApi = 6
export const providersPluginLink = 'obsidian://show-plugin?id=ai-providers'

export async function getAIProviders(app: App): Promise<IAIProvidersService> {
	// The SDK waits indefinitely when the companion is disabled or missing.
	const host: App & { aiProviders?: IAIProvidersService } = app
	if (!host.aiProviders) {
		throw new Error('Install and enable the AI Providers community plugin to generate replies.')
	}
	const ai = await (await waitForAI()).promise
	if (!supportsVersion(ai, requiredApi)) {
		throw new Error(`Update AI Providers to ${recommendedPluginVersionForApi(requiredApi)} to generate replies.`)
	}
	ai.checkCompatibility(requiredApi)
	return ai
}

export function chatModels(ai: IAIProvidersService, provider: IAIProvider): string[] {
	const discovered = ai.getModels({ provider })
	const ids = new Set(Object.keys(discovered))
	if (provider.model) ids.add(provider.model)
	return [...ids].filter(model => ai.getModelCapabilities({ provider, model })?.text !== false)
}

export function reasoningModes(ai: IAIProvidersService, provider: IAIProvider, model: string): string[] {
	return ai.getModelCapabilities({ provider, model })?.reasoningModes ?? []
}

export function resolveChat(ai: IAIProvidersService, settings: ChatStreamSettings) {
	const provider = ai.providers.find(candidate => candidate.id === settings.providerId)
	if (!provider) throw new Error('Choose a provider in Chat Stream settings.')
	const model = settings.modelId || provider.model
	if (!model || !chatModels(ai, provider).includes(model)) {
		throw new Error('Choose an available chat model in Chat Stream settings.')
	}
	return { provider, model }
}

export async function completeChat(
	ai: IAIProvidersService,
	{ provider, model }: ReturnType<typeof resolveChat>,
	messages: IChatMessage[],
	settings: ChatStreamSettings,
	abortController: AbortController
): Promise<string> {
	const options = {
		...(settings.maxResponseTokens > 0 ? { max_tokens: settings.maxResponseTokens } : {}),
		...(settings.temperature === null ? {} : { temperature: settings.temperature })
	}
	const useReasoning = reasoningModes(ai, provider, model).includes(settings.reasoningMode)
	const response = await ai.execute({
		provider,
		model,
		messages,
		abortController,
		options,
		...(useReasoning ? { reasoningMode: settings.reasoningMode } : {})
	})
	if (!response.trim()) throw new Error('The selected model returned an empty reply.')
	return response
}
