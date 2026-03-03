import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    name: { type: 'String', required: true, length: 100 },
    description: { type: 'String', optional: true },
  },

  relations: {
    products: { type: 'Product', isList: true },
  },

  enums: {},

  access: {
    read: 'auth() != null',
    create: "auth().role == 'ADMIN'",
    update: "auth().role == 'ADMIN'",
    delete: "auth().role == 'ADMIN'",
  },

  hooks: {},

  ui: {
    icon: 'Layers',
    defaultView: 'list',
    list: {
      columns: ['name', 'description'],
      searchable: ['name'],
    },
    form: {
      sections: [
        {
          title: 'Basic Info',
          i18n: { en: 'Basic Info', 'zh-TW': '基本資料' },
          fields: [['name'], ['description']],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Category',
      plural: 'Categories',
      fields: { name: 'Name', description: 'Description' },
    },
    'zh-TW': {
      caption: '分類',
      plural: '分類',
      fields: { name: '名稱', description: '描述' },
    },
  },
})
