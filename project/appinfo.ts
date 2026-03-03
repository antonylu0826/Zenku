import { defineAppInfo } from '@zenku/core'

export default defineAppInfo({
  name: 'New Zenku App',
  database: {
    provider: 'sqlite',
    url: 'env("DATABASE_URL")',
  },
  defaultLanguage: 'zh-TW',
  availableLanguages: ['en', 'zh-TW'],
})
