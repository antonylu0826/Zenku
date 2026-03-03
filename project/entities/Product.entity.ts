import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    name: { type: 'String', required: true, length: 100 },
    price: { type: 'Float', required: true, format: 'C2' },
    sku: { type: 'String', optional: true, unique: true },
    status: { type: 'String', enum: 'ProductStatus', default: 'ACTIVE' },
    categoryId: { type: 'String', required: true },
  },

  relations: {
    category: { type: 'Category', field: 'categoryId', lookupField: 'name' },
  },

  enums: {
    ProductStatus: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
  },

  access: {
    read: 'auth() != null',
    create: "auth().role == 'ADMIN'",
    update: "auth().role == 'ADMIN'",
    delete: "auth().role == 'ADMIN'",
  },

  hooks: {},

  ui: {
    icon: 'Package',
    defaultView: 'list',
    list: {
      columns: ['name', 'sku', 'price', 'status', 'category'],
      searchable: ['name', 'sku'],
      filterable: ['status', 'categoryId'],
    },
    form: {
      sections: [
        {
          title: 'Product Info',
          i18n: { en: 'Product Info', 'zh-TW': '產品資訊' },
          fields: [['name', 'sku'], ['price', 'status'], ['categoryId']],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Product',
      plural: 'Products',
      fields: {
        name: 'Name',
        price: 'Price',
        sku: 'SKU',
        status: 'Status',
        categoryId: 'Category'
      },
    },
    'zh-TW': {
      caption: '產品',
      plural: '產品',
      fields: {
        name: '名稱',
        price: '價格',
        sku: '編號',
        status: '狀態',
        categoryId: '分類'
      },
    },
  },
})
