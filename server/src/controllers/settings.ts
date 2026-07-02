import type { Core } from '@strapi/strapi';

import { PROVIDER_NAMES } from '../providers/types';

const settingsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(ctx: any) {
    ctx.body = await strapi.plugin('llm-translate').service('settings').getMasked();
  },

  async set(ctx: any) {
    const { provider, apiKey, model, systemPrompt } = ctx.request.body ?? {};

    if (!PROVIDER_NAMES.includes(provider)) {
      return ctx.badRequest(`provider must be one of: ${PROVIDER_NAMES.join(', ')}`);
    }

    const service = strapi.plugin('llm-translate').service('settings');
    const current = await service.get();

    await service.set({
      provider,
      model: typeof model === 'string' ? model : current.model,
      systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : current.systemPrompt,
      apiKey: typeof apiKey === 'string' && apiKey.trim() !== '' ? apiKey.trim() : current.apiKey,
    });

    ctx.body = await service.getMasked();
  },
});

export default settingsController;
