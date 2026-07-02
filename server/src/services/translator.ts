import type { Core } from '@strapi/strapi';

import { buildDeepPopulate, buildTargetData } from './extract';
import { createProvider } from '../providers';

export type TranslateMode = 'overwrite' | 'empty-only';

export interface TranslateDocumentInput {
  uid: string;
  documentId: string;
  sourceLocale: string;
  mode: TranslateMode;
  /** Locale codes to translate into. Defaults to every other enabled locale. */
  targetLocales?: string[];
}

export interface LocaleTranslationResult {
  locale: string;
  translatedFields: number;
  totalFields: number;
  skippedExisting: number;
  error?: string;
}

export interface TranslateDocumentResult {
  sourceLocale: string;
  results: LocaleTranslationResult[];
}

interface LocaleInfo {
  code: string;
  name?: string;
}

async function getEnabledLocales(strapi: Core.Strapi): Promise<LocaleInfo[]> {
  return (await strapi.plugin('i18n').service('locales').find()) as LocaleInfo[];
}

function nonEmptyTextByKey(slots: ReturnType<typeof buildTargetData>['slots']): Map<string, string> {
  const map = new Map<string, string>();
  for (const slot of slots) {
    const value = slot.get();
    if (typeof value === 'string' && value.trim() !== '') {
      map.set(slot.key, value);
    }
  }
  return map;
}

const translatorService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async translateDocument(input: TranslateDocumentInput): Promise<TranslateDocumentResult> {
    const { uid, documentId, sourceLocale, mode } = input;

    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!contentType) {
      throw new Error(`Unknown content type: ${uid}`);
    }
    if ((contentType as any).pluginOptions?.i18n?.localized !== true) {
      throw new Error(`Content type "${uid}" does not have internationalization enabled`);
    }

    const settings = await strapi.plugin('llm-translate').service('settings').get();
    if (!settings.apiKey) {
      throw new Error('No LLM API key configured. Set one up under Settings > LLM Translate.');
    }

    const provider = createProvider(settings);
    const attributes = contentType.attributes as any;
    const populate = buildDeepPopulate(strapi, attributes);

    const sourceEntity = await strapi.documents(uid as any).findOne({
      documentId,
      locale: sourceLocale,
      populate,
    });
    if (!sourceEntity) {
      throw new Error(`Document ${documentId} not found for locale "${sourceLocale}"`);
    }

    const allLocales = await getEnabledLocales(strapi);
    const localeNameByCode = new Map(allLocales.map((locale) => [locale.code, locale.name]));
    const allLocaleCodes = allLocales.map((locale) => locale.code);
    const targetLocales = (input.targetLocales?.length ? input.targetLocales : allLocaleCodes).filter(
      (locale) => locale !== sourceLocale,
    );

    const results: LocaleTranslationResult[] = [];

    for (const targetLocale of targetLocales) {
      try {
        const { data, slots } = buildTargetData(strapi, attributes, sourceEntity);

        let slotsToTranslate = slots;
        let skippedExisting = 0;

        if (mode === 'empty-only') {
          const targetEntity = await strapi.documents(uid as any).findOne({
            documentId,
            locale: targetLocale,
            populate,
          });

          if (targetEntity) {
            const { slots: targetSlots } = buildTargetData(strapi, attributes, targetEntity);
            const existingByKey = nonEmptyTextByKey(targetSlots);

            slotsToTranslate = [];
            for (const slot of slots) {
              const existing = existingByKey.get(slot.key);
              if (existing !== undefined) {
                slot.set(existing); // keep the already-filled-in target content untouched
                skippedExisting += 1;
              } else {
                slotsToTranslate.push(slot);
              }
            }
          }
        }

        if (slotsToTranslate.length > 0) {
          const batch = Object.fromEntries(slotsToTranslate.map((slot) => [slot.key, slot.get()]));
          const translated = await provider.translate(batch, {
            from: sourceLocale,
            to: targetLocale,
            fromName: localeNameByCode.get(sourceLocale),
            toName: localeNameByCode.get(targetLocale),
            systemPrompt: settings.systemPrompt || undefined,
          });

          for (const slot of slotsToTranslate) {
            const value = translated[slot.key];
            if (typeof value === 'string') {
              slot.set(value);
            }
            // else: leave the source-language text in place as a safe fallback.
          }
        }

        await strapi.documents(uid as any).update({
          documentId,
          locale: targetLocale,
          data,
        });

        results.push({
          locale: targetLocale,
          translatedFields: slotsToTranslate.length,
          totalFields: slots.length,
          skippedExisting,
        });
      } catch (error: any) {
        strapi.log.error(`[llm-translate] failed to translate ${uid} ${documentId} -> ${targetLocale}`, error);
        results.push({
          locale: targetLocale,
          translatedFields: 0,
          totalFields: 0,
          skippedExisting: 0,
          error: error?.message || 'Unknown error',
        });
      }
    }

    return { sourceLocale, results };
  },
});

export default translatorService;
