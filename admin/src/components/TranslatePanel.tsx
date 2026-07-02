import type { PanelComponentProps } from '@strapi/content-manager/strapi-admin';

import { TranslatePanelContent } from './TranslatePanelContent';

/**
 * Registered via `addEditViewSidePanel`. Strapi calls this as a plain
 * function (not through React's render cycle) to collect `{ title, content }`,
 * so it must stay hook-free — all interactive logic lives in
 * `TranslatePanelContent`, which IS rendered as a normal component.
 *
 * Returns `null` for content types without internationalization enabled
 * (they never carry a `document.locale`), which Strapi filters out of the
 * sidebar just like any other falsy panel result.
 */
export function TranslatePanel(props: PanelComponentProps) {
  const document = props.document as { locale?: string; documentId?: string } | undefined;
  const locale = document?.locale;

  if (!locale) return null;

  // For single types the URL never carries an `:id` segment, so `props.documentId`
  // (derived from the route) is always undefined there — the real id only lives
  // on the fetched document itself. Collection types populate both.
  const documentId = props.documentId ?? document?.documentId;

  return {
    title: 'LLM Translate',
    content: (
      <TranslatePanelContent
        uid={props.model}
        documentId={documentId}
        sourceLocale={locale}
        collectionType={props.collectionType}
      />
    ),
  };
}
