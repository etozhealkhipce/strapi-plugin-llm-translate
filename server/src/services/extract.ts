import type { Core, Schema } from '@strapi/strapi';

import { collectBlocksSlots } from './blocks';

/**
 * A single translatable leaf: `key` is a stable, human-readable path used
 * both as the batch key sent to the LLM provider and to match up the same
 * field between the source and an existing target locale (for "empty only"
 * mode). `get`/`set` close over the actual object being built, so applying a
 * translation never requires re-parsing the path back into nested data.
 */
export interface TranslatableSlot {
  key: string;
  get(): string;
  set(value: string): void;
}

export interface BuildResult {
  /** Plain data payload ready to send to `strapi.documents(uid).update()`. */
  data: Record<string, any>;
  slots: TranslatableSlot[];
}

const TEXT_TYPES = new Set(['string', 'text']);

function isLocalized(attribute: Schema.Attribute.AnyAttribute): boolean {
  return (attribute as any)?.pluginOptions?.i18n?.localized !== false;
}

/** Deep-clones a value that is not itself a translation target (numbers, dates, json, ...). */
function passthroughValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

/** Relations and media are sent back as id references, never as fully populated objects. */
function toIdRefs(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item: any) => item?.id ?? item?.documentId ?? item).filter((v) => v !== undefined);
  }
  return (value as any)?.id ?? (value as any)?.documentId ?? value;
}

function withKeyPrefix(prefix: string, slot: TranslatableSlot): TranslatableSlot {
  return { ...slot, key: `${prefix}.${slot.key}` };
}

/**
 * Walks a content-type (or component) schema together with a populated
 * entity, producing a plain-object `data` payload (safe to send to the
 * Document Service) plus the flat list of translatable text slots found
 * anywhere in it — including inside repeatable/single components and
 * dynamic zones.
 */
export function buildTargetData(
  strapi: Core.Strapi,
  attributes: Record<string, Schema.Attribute.AnyAttribute>,
  source: Record<string, any>,
): BuildResult {
  const data: Record<string, any> = {};
  const slots: TranslatableSlot[] = [];

  for (const [fieldName, attribute] of Object.entries(attributes)) {
    const raw = source?.[fieldName];
    if (raw === undefined) continue;

    const type = (attribute as any).type as string;
    const translatable = isLocalized(attribute) && (TEXT_TYPES.has(type) || type === 'blocks' || type === 'component' || type === 'dynamiczone');

    if (!translatable) {
      if (type === 'relation' || type === 'media') {
        data[fieldName] = toIdRefs(raw);
      } else {
        data[fieldName] = passthroughValue(raw);
      }
      continue;
    }

    if (TEXT_TYPES.has(type)) {
      const text = typeof raw === 'string' ? raw : '';
      data[fieldName] = text;
      if (text.trim() !== '') {
        slots.push({
          key: fieldName,
          get: () => data[fieldName],
          set: (value: string) => {
            data[fieldName] = value;
          },
        });
      }
      continue;
    }

    if (type === 'blocks') {
      const { clonedBlocks, slots: blockSlots } = collectBlocksSlots(raw, fieldName);
      data[fieldName] = clonedBlocks;
      slots.push(...blockSlots);
      continue;
    }

    if (type === 'component') {
      const componentUid = (attribute as any).component as string;
      const componentAttributes = strapi.components[componentUid]?.attributes ?? {};

      if ((attribute as any).repeatable) {
        const items = Array.isArray(raw) ? raw : [];
        data[fieldName] = items.map((item, index) => {
          const child = buildTargetData(strapi, componentAttributes, item);
          slots.push(...child.slots.map((slot) => withKeyPrefix(`${fieldName}.${index}`, slot)));
          return child.data;
        });
      } else if (raw && typeof raw === 'object') {
        const child = buildTargetData(strapi, componentAttributes, raw);
        data[fieldName] = child.data;
        slots.push(...child.slots.map((slot) => withKeyPrefix(fieldName, slot)));
      } else {
        data[fieldName] = raw;
      }
      continue;
    }

    if (type === 'dynamiczone') {
      const items = Array.isArray(raw) ? raw : [];
      data[fieldName] = items.map((item, index) => {
        if (!item?.__component) return item;
        const componentAttributes = strapi.components[item.__component]?.attributes ?? {};
        const child = buildTargetData(strapi, componentAttributes, item);
        slots.push(...child.slots.map((slot) => withKeyPrefix(`${fieldName}.${index}`, slot)));
        return { ...child.data, __component: item.__component };
      });
    }
  }

  return { data, slots };
}

/**
 * Builds a Document Service `populate` object deep enough to resolve every
 * component, dynamic-zone entry and media/relation field declared in the
 * schema, so `buildTargetData` always sees fully-populated content.
 */
export function buildDeepPopulate(
  strapi: Core.Strapi,
  attributes: Record<string, Schema.Attribute.AnyAttribute>,
): Record<string, any> {
  const populate: Record<string, any> = {};

  for (const [fieldName, attribute] of Object.entries(attributes)) {
    const type = (attribute as any).type as string;

    if (type === 'component') {
      const componentUid = (attribute as any).component as string;
      const componentAttributes = strapi.components[componentUid]?.attributes ?? {};
      populate[fieldName] = { populate: buildDeepPopulate(strapi, componentAttributes) };
    } else if (type === 'dynamiczone') {
      const componentUids = ((attribute as any).components as string[]) ?? [];
      const on: Record<string, any> = {};
      for (const componentUid of componentUids) {
        const componentAttributes = strapi.components[componentUid]?.attributes ?? {};
        on[componentUid] = { populate: buildDeepPopulate(strapi, componentAttributes) };
      }
      populate[fieldName] = { on };
    } else if (type === 'media' || type === 'relation') {
      populate[fieldName] = true;
    }
  }

  return populate;
}
