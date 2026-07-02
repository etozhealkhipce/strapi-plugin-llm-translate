import { useState } from 'react';
import { Box, Button, Typography } from '@strapi/design-system';
import { Earth } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';
import { TranslateModal } from './TranslateModal';

interface Props {
  uid: string;
  documentId?: string;
  sourceLocale: string;
  collectionType: string;
}

export const TranslatePanelContent = ({ uid, documentId, sourceLocale, collectionType }: Props) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Button
        fullWidth
        variant="secondary"
        startIcon={<Earth />}
        disabled={!documentId}
        onClick={() => setOpen(true)}
      >
        {formatMessage({
          id: getTranslation('panel.button'),
          defaultMessage: 'Translate to all languages',
        })}
      </Button>
      {!documentId && (
        <Box paddingTop={2}>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: getTranslation('panel.save-first'),
              defaultMessage: 'Save the entry first to enable translation.',
            })}
          </Typography>
        </Box>
      )}
      {open && documentId && (
        <TranslateModal
          uid={uid}
          documentId={documentId}
          sourceLocale={sourceLocale}
          collectionType={collectionType}
          onClose={() => setOpen(false)}
        />
      )}
    </Box>
  );
};
