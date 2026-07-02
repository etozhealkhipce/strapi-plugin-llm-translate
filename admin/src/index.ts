import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { TranslatePanel } from './components/TranslatePanel';

import type { StrapiApp } from '@strapi/strapi/admin';

const plugin: StrapiApp['appPlugins'][string] = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });

    app.createSettingSection(
      {
        id: PLUGIN_ID,
        intlLabel: {
          id: getTranslation('settings.section-label'),
          defaultMessage: 'LLM Translate',
        },
      },
      [
        {
          intlLabel: {
            id: getTranslation('settings.link-label'),
            defaultMessage: 'Configuration',
          },
          id: 'configuration',
          to: `/settings/${PLUGIN_ID}`,
          Component: () => import('./pages/Settings'),
          permissions: [],
        },
      ],
    );
  },

  bootstrap(app) {
    // Adds the "Translate to all languages" panel to every localized
    // content type's Edit view sidebar, the same way Strapi's own
    // Releases/i18n panels are registered.
    (app.getPlugin('content-manager') as any).apis.addEditViewSidePanel((panels: unknown[]) => [
      TranslatePanel,
      ...panels,
    ]);
  },

  registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(`./translations/${locale}.json`)) as {
            default: Record<string, string>;
          };

          const newData: Record<string, string> = {};
          const keys = Object.keys(data);

          for (const key of keys) {
            newData[getTranslation(key)] = data[key];
          }

          return { data: newData, locale };
        } catch {
          return { data: {}, locale };
        }
      }),
    );
  },
};

export default plugin;
