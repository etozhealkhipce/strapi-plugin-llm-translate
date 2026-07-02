import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Loader,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { adminApi } from '@strapi/admin/strapi-admin';

import { getTranslation } from '../utils/getTranslation';

interface Locale {
  code: string;
  name?: string;
}

interface LocaleResult {
  locale: string;
  translatedFields: number;
  totalFields: number;
  skippedExisting: number;
  error?: string;
}

interface Props {
  uid: string;
  documentId: string;
  sourceLocale: string;
  collectionType: string;
  onClose: () => void;
}

type Mode = 'empty-only' | 'overwrite';

export const TranslateModal = ({ uid, documentId, sourceLocale, collectionType, onClose }: Props) => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const dispatch = useDispatch();

  const [locales, setLocales] = useState<Locale[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('empty-only');
  const [loadingLocales, setLoadingLocales] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<LocaleResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await get('/i18n/locales');
        const targets: Locale[] = (Array.isArray(data) ? data : []).filter(
          (locale: Locale) => locale.code !== sourceLocale,
        );
        if (!cancelled) {
          setLocales(targets);
          setSelected(new Set(targets.map((locale) => locale.code)));
        }
      } finally {
        if (!cancelled) setLoadingLocales(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [get, sourceLocale]);

  const allSelected = selected.size > 0 && selected.size === locales.length;
  const someSelected = selected.size > 0 && selected.size < locales.length;

  const toggleLocale = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(locales.map((locale) => locale.code)));
  };

  const summary = useMemo(() => {
    if (!results) return null;
    const ok = results.filter((result) => !result.error);
    const failed = results.filter((result) => result.error);
    return { ok, failed };
  }, [results]);

  const handleTranslate = async () => {
    setRunning(true);
    setResults(null);

    try {
      const { data } = await post('/llm-translate/translate', {
        uid,
        documentId,
        sourceLocale,
        mode,
        targetLocales: Array.from(selected),
      });

      setResults(data.results as LocaleResult[]);

      // Refresh every cached view of this document (locale status picker,
      // edit form, list view, ...) now that other locales were written
      // server-side without going through the usual save/publish actions.
      dispatch(
        adminApi.util.invalidateTags([
          {
            // @ts-expect-error 'Document' tag isn't part of adminApi's public tag types
            type: 'Document',
            id: collectionType !== 'single-types' ? `${uid}_${documentId}` : uid,
          },
        ]),
      );

      const hasErrors = (data.results as LocaleResult[]).some((result) => result.error);
      toggleNotification({
        type: hasErrors ? 'warning' : 'success',
        message: formatMessage({
          id: getTranslation(hasErrors ? 'modal.partial-success' : 'modal.success'),
          defaultMessage: hasErrors ? 'Translation finished with some errors' : 'Translation completed',
        }),
      });
    } catch (error: any) {
      toggleNotification({
        type: 'danger',
        message:
          error?.response?.data?.error?.message ||
          formatMessage({ id: getTranslation('modal.error'), defaultMessage: 'Translation failed' }),
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal.Root
      open
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('modal.title'),
              defaultMessage: 'Translate to all languages',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Field.Root
              name="mode"
              hint={formatMessage({
                id: getTranslation('modal.mode-hint'),
                defaultMessage:
                  'Fields already filled in on the target language are kept untouched unless you choose to overwrite everything.',
              })}
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation('modal.mode-label'),
                  defaultMessage: 'Existing translations',
                })}
              </Field.Label>
              <SingleSelect value={mode} onChange={(value: string | number) => setMode(value as Mode)}>
                <SingleSelectOption value="empty-only">
                  {formatMessage({
                    id: getTranslation('modal.mode-empty-only'),
                    defaultMessage: 'Fill in empty fields only',
                  })}
                </SingleSelectOption>
                <SingleSelectOption value="overwrite">
                  {formatMessage({
                    id: getTranslation('modal.mode-overwrite'),
                    defaultMessage: 'Overwrite everything',
                  })}
                </SingleSelectOption>
              </SingleSelect>
              <Field.Hint />
            </Field.Root>

            <Box>
              <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                {formatMessage({
                  id: getTranslation('modal.locales-label'),
                  defaultMessage: 'Target languages',
                })}
              </Typography>
              {loadingLocales ? (
                <Box paddingTop={2}>
                  <Loader small>
                    {formatMessage({ id: getTranslation('modal.loading'), defaultMessage: 'Loading…' })}
                  </Loader>
                </Box>
              ) : (
                <Flex direction="column" alignItems="stretch" gap={2} paddingTop={2}>
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                  >
                    {formatMessage({ id: getTranslation('modal.select-all'), defaultMessage: 'Select all' })}
                  </Checkbox>
                  <Flex direction="column" alignItems="stretch" gap={2} paddingLeft={4}>
                    {locales.map((locale) => (
                      <Checkbox
                        key={locale.code}
                        checked={selected.has(locale.code)}
                        onCheckedChange={() => toggleLocale(locale.code)}
                      >
                        {locale.name ? `${locale.name} (${locale.code})` : locale.code}
                      </Checkbox>
                    ))}
                  </Flex>
                </Flex>
              )}
            </Box>

            {summary && (
              <Box>
                <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                  {formatMessage({ id: getTranslation('modal.results'), defaultMessage: 'Result' })}
                </Typography>
                <Flex direction="column" alignItems="stretch" gap={1} paddingTop={2}>
                  {summary.ok.map((result) => (
                    <Typography key={result.locale} variant="pi" textColor="success600">
                      {result.locale}: {result.translatedFields}/{result.totalFields}{' '}
                      {formatMessage({ id: getTranslation('modal.fields-translated'), defaultMessage: 'fields translated' })}
                    </Typography>
                  ))}
                  {summary.failed.map((result) => (
                    <Typography key={result.locale} variant="pi" textColor="danger600">
                      {result.locale}: {result.error}
                    </Typography>
                  ))}
                </Flex>
              </Box>
            )}
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onClick={onClose}>
            {formatMessage({ id: getTranslation('modal.close'), defaultMessage: 'Close' })}
          </Button>
          <Button onClick={handleTranslate} loading={running} disabled={running || selected.size === 0}>
            {formatMessage({ id: getTranslation('modal.run'), defaultMessage: 'Translate' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
