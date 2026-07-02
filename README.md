[![](https://flat.badgen.net/npm/v/@alkhipce/strapi-plugin-llm-translate?icon=npm)](https://www.npmjs.com/package/@alkhipce/strapi-plugin-llm-translate)
[![](https://flat.badgen.net/github/stars/etozhealkhipce/strapi-plugin-llm-translate)](https://github.com/etozhealkhipce/strapi-plugin-llm-translate)

# strapi-plugin-llm-translate

Bulk-translate Strapi i18n entries with Anthropic or OpenAI from the Content Manager edit view.

## What it does

- Sidebar panel on localized content types: **Translate to all languages**
- Translates text fields, Blocks, components, and dynamic zones recursively
- Leaves media, relations, and non-text fields unchanged
- **Fill empty** — only untranslated fields; **Overwrite** — re-translate everything from the source locale
- Honors locale script tags (`zh-Hans`, `sr-Latn`, etc.)

## Requirements

- Strapi `^5.0.0`, Node 18–22
- Built-in `i18n` plugin with target locales configured
- [Anthropic](https://console.anthropic.com/settings/keys) or [OpenAI](https://platform.openai.com/api-keys) API key

## Install

```bash
npm install @alkhipce/strapi-plugin-llm-translate
```

Auto-discovered via `"strapi": { "kind": "plugin" }` in `package.json`. Optional explicit config:

```ts
// config/plugins.ts
export default {
  'llm-translate': { enabled: true },
};
```

```bash
npm run build && npm run develop
```

## Settings

**Settings → LLM Translate**

| Field | Notes |
| --- | --- |
| Provider | `anthropic` or `openai` |
| API key | Stored server-side, not returned to the admin UI |
| Model | Optional; plugin picks a default if empty |
| Additional instructions | Appended to every request (tone, terminology, etc.) |

## Usage

1. Open a localized entry in Content Manager.
2. Sidebar → **Translate to all languages**.
3. Select target locales and fill/overwrite mode.
4. **Translate** — creates or updates locale variants via Document Service.

## Implementation notes

- Text extracted by schema walk, not JSON diff.
- LLM output validated against JSON Schema (fixed key set).
- Blocks: leaf text nodes only; marks, links, and tree structure kept.

## License

MIT
