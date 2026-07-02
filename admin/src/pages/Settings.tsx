import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Main,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

import { getTranslation } from '../utils/getTranslation';

type Provider = 'anthropic' | 'openai';

interface MaskedSettings {
  provider: Provider;
  model: string;
  systemPrompt: string;
  hasApiKey: boolean;
  maskedApiKey: string;
}

const Settings = () => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await get('/llm-translate/settings');
        applySettings(data);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySettings = (data: MaskedSettings) => {
    setProvider(data.provider);
    setModel(data.model ?? '');
    setSystemPrompt(data.systemPrompt ?? '');
    setHasApiKey(Boolean(data.hasApiKey));
    setMaskedApiKey(data.maskedApiKey ?? '');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await put('/llm-translate/settings', {
        provider,
        model,
        systemPrompt,
        // Sending an empty apiKey means "keep the currently saved key".
        apiKey,
      });
      applySettings(data);
      setApiKey('');
      toggleNotification({
        type: 'success',
        message: formatMessage({ id: getTranslation('settings.saved'), defaultMessage: 'Settings saved' }),
      });
    } catch (error: any) {
      toggleNotification({
        type: 'danger',
        message:
          error?.response?.data?.error?.message ||
          formatMessage({ id: getTranslation('settings.save-error'), defaultMessage: 'Could not save settings' }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={6} maxWidth="480px">
          <Typography variant="alpha" tag="h1">
            {formatMessage({ id: getTranslation('settings.title'), defaultMessage: 'LLM Translate' })}
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            {formatMessage({
              id: getTranslation('settings.description'),
              defaultMessage:
                'Configure the LLM provider used to auto-translate content across every enabled locale.',
            })}
          </Typography>

          <Field.Root name="provider">
            <Field.Label>
              {formatMessage({ id: getTranslation('settings.provider'), defaultMessage: 'Provider' })}
            </Field.Label>
            <SingleSelect value={provider} onChange={(value: string | number) => setProvider(value as Provider)}>
              <SingleSelectOption value="anthropic">Anthropic (Claude)</SingleSelectOption>
              <SingleSelectOption value="openai">OpenAI</SingleSelectOption>
            </SingleSelect>
          </Field.Root>

          <Field.Root
            name="model"
            hint={formatMessage({
              id: getTranslation('settings.model-hint'),
              defaultMessage: 'Leave empty to use the default model for the selected provider.',
            })}
          >
            <Field.Label>
              {formatMessage({ id: getTranslation('settings.model'), defaultMessage: 'Model' })}
            </Field.Label>
            <TextInput
              placeholder={provider === 'anthropic' ? 'claude-sonnet-5' : 'gpt-4o'}
              value={model}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="apiKey"
            hint={formatMessage({
              id: getTranslation('settings.api-key-hint'),
              defaultMessage: 'Leave empty to keep the currently saved key.',
            })}
          >
            <Field.Label>
              {formatMessage({ id: getTranslation('settings.api-key'), defaultMessage: 'API key' })}
            </Field.Label>
            <TextInput
              type="password"
              placeholder={hasApiKey ? maskedApiKey : formatMessage({
                id: getTranslation('settings.api-key-placeholder'),
                defaultMessage: 'Not set',
              })}
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>

          <Field.Root
            name="systemPrompt"
            hint={formatMessage({
              id: getTranslation('settings.system-prompt-hint'),
              defaultMessage: 'Appended to every translation request, e.g. tone of voice or domain terms.',
            })}
          >
            <Field.Label>
              {formatMessage({
                id: getTranslation('settings.system-prompt'),
                defaultMessage: 'Additional instructions (optional)',
              })}
            </Field.Label>
            <Textarea
              value={systemPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemPrompt(e.target.value)}
            />
            <Field.Hint />
          </Field.Root>

          <Flex justifyContent="flex-end">
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              {formatMessage({ id: getTranslation('settings.save'), defaultMessage: 'Save' })}
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Main>
  );
};

export default Settings;
