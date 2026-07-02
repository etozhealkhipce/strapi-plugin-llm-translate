import OpenAI from 'openai';

import { buildBatchSchema, buildSystemPrompt } from './prompt';
import type { LlmProvider, TranslateOptions } from './types';

const DEFAULT_MODEL = 'gpt-4o';

const createOpenAiProvider = (apiKey: string, model?: string): LlmProvider => {
  const client = new OpenAI({ apiKey });

  return {
    async translate(items: Record<string, string>, opts: TranslateOptions) {
      const keys = Object.keys(items);
      if (keys.length === 0) return {};

      const completion = await client.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(opts) },
          { role: 'user', content: JSON.stringify(items) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'translation_batch',
            strict: true,
            schema: buildBatchSchema(keys),
          },
        },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return {};

      try {
        return JSON.parse(content) as Record<string, string>;
      } catch {
        throw new Error('OpenAI returned invalid JSON for the translation batch');
      }
    },
  };
};

export default createOpenAiProvider;
