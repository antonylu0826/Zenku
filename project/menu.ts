import { defineMenu } from '@zenku/core'

export default defineMenu([
  {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    i18n: { en: 'Dashboard', 'zh-TW': '儀錶板' },
    items: [],
  },
  {
    label: 'Product Management',
    icon: 'Box',
    i18n: { en: 'Products', 'zh-TW': '產品管理' },
    items: [
      { entity: 'Category' },
      { entity: 'Product' },
    ],
  },
])
