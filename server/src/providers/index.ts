import createAnthropicProvider from './anthropic';
import createOpenAiProvider from './openai';
import type { LlmProvider } from './types';
import type { LlmTranslateSettings } from '../services/settings';

export function createProvider(settings: LlmTranslateSettings): LlmProvider {
  switch (settings.provider) {
    case 'anthropic':
      return createAnthropicProvider(settings.apiKey, settings.model);
    case 'openai':
      return createOpenAiProvider(settings.apiKey, settings.model);
    default:
      throw new Error(`Unknown LLM provider: ${settings.provider}`);
  }
}
