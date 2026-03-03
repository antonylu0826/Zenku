import { defineMenu } from '@zenku/core'

export default defineMenu([
  {
    label: 'Basic Data',
    icon: 'Database',
    i18n: { en: 'Basic Data', 'zh-TW': '基礎資料' },
    items: [
      { entity: 'Category' },
      { entity: 'Warehouse' },
      { entity: 'Supplier' },
      { entity: 'Customer' },
    ],
  },
  {
    label: 'Inventory Management',
    icon: 'Package',
    i18n: { en: 'Inventory Management', 'zh-TW': '進銷存管理' },
    items: [
      { entity: 'Product' },
      { entity: 'Inventory' },
      { entity: 'PurchaseOrder' },
      { entity: 'SalesOrder' },
    ],
  },
])
