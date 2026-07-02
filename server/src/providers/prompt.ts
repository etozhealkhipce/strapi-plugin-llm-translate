import type { TranslateOptions } from './types';

/**
 * ISO 15924 script subtags that show up in this project's locale codes
 * (BCP-47 language-script codes like "zh-Hans"). A bare code like that is
 * ambiguous to an LLM — "zh" alone defaults to Simplified Chinese, so without
 * calling out the script explicitly the model tends to ignore the "-Hant"
 * suffix and answer in the wrong script.
 */
const SCRIPT_NAMES: Record<string, string> = {
  Cyrl: 'Cyrillic',
  Latn: 'Latin',
  Arab: 'Arabic',
  Hans: 'Simplified Chinese',
  Hant: 'Traditional Chinese',
};

function describeLocale(code: string, name?: string): string {
  return name ? `"${name}" (locale code "${code}")` : `locale code "${code}"`;
}

function scriptInstruction(code: string): string {
  const script = code.split('-')[1];
  const scriptName = script && SCRIPT_NAMES[script];
  return scriptName
    ? ` The target locale code specifies the ${scriptName} script — you MUST write the entire translation using the ${scriptName} script, even if the same language is more commonly written in a different script.`
    : '';
}

/**
 * Shared system prompt used by every provider. Keeping it in one place means
 * switching providers in settings never changes translation behaviour.
 */
export function buildSystemPrompt({ from, to, fromName, toName, systemPrompt }: TranslateOptions): string {
  const base =
    `You are a professional localization translator working inside a CMS. ` +
    `You will receive a JSON object where every value is a piece of content written in ${describeLocale(from, fromName)}. ` +
    `Translate every value into ${describeLocale(to, toName)}.${scriptInstruction(to)} ` +
    `Return a JSON object with exactly the same keys, in the same order, each value replaced by its translation. ` +
    `Never add, remove, or rename keys. Never translate keys, only values. ` +
    `Preserve formatting, numbers, punctuation, placeholders and whitespace-only strings as-is. ` +
    `If a value is not natural language (e.g. a code, slug or already in the target language), return it unchanged. ` +
    `Do not add explanations, notes or markdown fences — only the JSON object described above.`;

  return systemPrompt ? `${base}\n\nAdditional instructions from the site editor: ${systemPrompt}` : base;
}

/** Builds a strict JSON Schema requiring the exact same keys as the input batch. */
export function buildBatchSchema(keys: string[]) {
  const properties: Record<string, { type: 'string' }> = {};
  for (const key of keys) {
    properties[key] = { type: 'string' };
  }

  return {
    type: 'object' as const,
    properties,
    required: keys,
    additionalProperties: false as const,
  };
}
