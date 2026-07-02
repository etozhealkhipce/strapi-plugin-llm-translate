import type { Core } from '@strapi/strapi';

import type { ProviderName } from '../providers/types';

export interface LlmTranslateSettings {
  provider: ProviderName;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export interface MaskedLlmTranslateSettings extends Omit<LlmTranslateSettings, 'apiKey'> {
  hasApiKey: boolean;
}

const STORE_KEY = 'settings';

const DEFAULT_SETTINGS: LlmTranslateSettings = {
  provider: 'anthropic',
  apiKey: '',
  model: '',
  systemPrompt: '',
};

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

const settingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = strapi.store({ type: 'plugin', name: 'llm-translate' });

  return {
    /** Full settings, including the raw API key. Server-side use only. */
    async get(): Promise<LlmTranslateSettings> {
      const value = (await store.get({ key: STORE_KEY })) as LlmTranslateSettings | null;
      return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
    },

    async set(settings: LlmTranslateSettings): Promise<void> {
      await store.set({ key: STORE_KEY, value: settings });
    },

    /** Settings safe to send to the admin UI — the API key is masked, never returned in full. */
    async getMasked(): Promise<MaskedLlmTranslateSettings & { maskedApiKey: string }> {
      const settings = await this.get();
      const { apiKey, ...rest } = settings;
      return {
        ...rest,
        hasApiKey: Boolean(apiKey),
        maskedApiKey: maskKey(apiKey),
      };
    },
  };
};

export default settingsService;
