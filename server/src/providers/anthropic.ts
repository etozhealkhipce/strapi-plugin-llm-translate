import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';

import { buildBatchSchema, buildSystemPrompt } from './prompt';
import type { LlmProvider, TranslateOptions } from './types';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 8192;

const createAnthropicProvider = (apiKey: string, model?: string): LlmProvider => {
  const client = new Anthropic({ apiKey });

  return {
    async translate(items: Record<string, string>, opts: TranslateOptions) {
      const keys = Object.keys(items);
      if (keys.length === 0) return {};

      const message = await client.messages.parse({
        model: model || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(opts),
        messages: [
          {
            role: 'user',
            content: JSON.stringify(items),
          },
        ],
        output_config: {
          format: jsonSchemaOutputFormat(buildBatchSchema(keys)),
        },
      });

      return (message.parsed_output as Record<string, string>) ?? {};
    },
  };
};

export default createAnthropicProvider;
