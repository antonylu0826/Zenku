import { defineAppInfo } from '@zenku/core'

export default defineAppInfo({
  name: 'Zenku',
  icon: '/logo.png',
  i18n: {
    en:      { name: 'Zenku' },
    'zh-TW': { name: 'Zenku 管理系統' },
  },
  database: {
    provider: 'sqlite',
    url: 'env("DATABASE_URL")',
  },
  defaultLanguage: 'zh-TW',
  availableLanguages: ['en', 'zh-TW'],
})
