export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.get',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.set',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/translate',
      handler: 'translate.translate',
      config: { policies: [] },
    },
  ],
};
