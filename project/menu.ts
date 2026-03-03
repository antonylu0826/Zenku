import { defineMenu } from '@zenku/core'

export default defineMenu([
  {
    label: 'Products',
    icon: 'Package',
    i18n: { en: 'Products', 'zh-TW': '產品管理' },
    items: [
      { entity: 'Category' },
      { entity: 'Product' },
    ],
  },
  {
    label: 'Purchasing',
    icon: 'ShoppingCart',
    i18n: { en: 'Purchasing', 'zh-TW': '採購管理' },
    items: [
      { entity: 'Supplier' },
      { entity: 'PurchaseOrder' },
    ],
  },
  {
    label: 'Sales',
    icon: 'TrendingUp',
    i18n: { en: 'Sales', 'zh-TW': '銷貨管理' },
    items: [
      { entity: 'Customer' },
      { entity: 'SalesOrder' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'Warehouse',
    i18n: { en: 'Inventory', 'zh-TW': '庫存管理' },
    items: [
      { entity: 'Warehouse' },
      { entity: 'InventoryTransaction' },
    ],
  },
  {
    label: 'Tasks',
    icon: 'CheckSquare',
    i18n: { en: 'Tasks', 'zh-TW': '任務管理' },
    items: [
      { entity: 'Task' },
      { entity: 'Event' },
    ],
  },
  {
    label: 'System',
    icon: 'Settings',
    i18n: { en: 'System', 'zh-TW': '系統管理' },
    items: [
      { entity: 'Attachment' },
    ],
    roles: ['ADMIN'],
  },
])
