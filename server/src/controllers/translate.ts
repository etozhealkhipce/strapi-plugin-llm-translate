import type { Core } from '@strapi/strapi';

import type { TranslateMode } from '../services/translator';

const translateController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async translate(ctx: any) {
    const { uid, documentId, sourceLocale, mode, targetLocales } = ctx.request.body ?? {};

    if (!uid || !documentId || !sourceLocale) {
      return ctx.badRequest('uid, documentId and sourceLocale are required');
    }
    const validModes: TranslateMode[] = ['overwrite', 'empty-only'];
    if (!validModes.includes(mode)) {
      return ctx.badRequest(`mode must be one of: ${validModes.join(', ')}`);
    }

    try {
      ctx.body = await strapi
        .plugin('llm-translate')
        .service('translator')
        .translateDocument({ uid, documentId, sourceLocale, mode, targetLocales });
    } catch (error: any) {
      strapi.log.error('[llm-translate] translate request failed', error);
      ctx.throw(400, error?.message || 'Translation failed');
    }
  },
});

export default translateController;
