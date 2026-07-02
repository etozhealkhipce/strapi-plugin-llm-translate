export interface TranslateOptions {
  /** Source locale code, e.g. "ru" */
  from: string;
  /** Target locale code, e.g. "zh-Hans" */
  to: string;
  /** Human-readable display name for `from`, e.g. "Russian (ru)", from i18n settings */
  fromName?: string;
  /** Human-readable display name for `to`, e.g. "Chinese (Simplified) (zh-Hans)", from i18n settings */
  toName?: string;
  /** Optional extra instructions appended to the base system prompt */
  systemPrompt?: string;
}

/**
 * A provider translates a flat map of `{ key: text }` and must return a map
 * with the exact same keys, each value replaced by its translation.
 * Using a flat key/value contract (instead of raw prose) lets every provider
 * return structured, schema-validated JSON so we never have to guess where
 * one field ends and the next begins.
 */
export interface LlmProvider {
  translate(items: Record<string, string>, opts: TranslateOptions): Promise<Record<string, string>>;
}

export type ProviderName = 'anthropic' | 'openai';

export const PROVIDER_NAMES: ProviderName[] = ['anthropic', 'openai'];
