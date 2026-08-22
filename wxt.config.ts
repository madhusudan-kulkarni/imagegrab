import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'firefox',
  manifestVersion: 3,
  zip: {
    artifactTemplate: '{{name}}-{{browser}}.zip',
  },
  manifest: {
    name: 'ImageGrab',
    description: 'Quickly save images from any webpage',
    permissions: ['downloads', 'contextMenus', 'activeTab', 'scripting', 'storage'],
    host_permissions: ['<all_urls>'],
    commands: {
      'open-batch-modal': {
        suggested_key: {
          default: 'Alt+Shift+I',
          mac: 'Alt+Shift+I',
        },
        description: 'Open ImageGrab Batch Downloader',
      },
    },
    action: {
      default_title: 'ImageGrab',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: '{30f41d2a-7d16-40be-8400-1329a834e65a}',
        data_collection_permissions: {
          required: ['none'],
        },
      } as any,
    },
  },
});
