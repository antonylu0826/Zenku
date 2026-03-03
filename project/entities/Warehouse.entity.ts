import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    name:     { type: 'String', required: true },
    code:     { type: 'String', optional: true, unique: true },
    location: { type: 'String', optional: true },
    ownerId:  { type: 'String', required: true },
  },

  relations: {
    inventoryTransactions: { type: 'InventoryTransaction', isList: true },
    owner:                 { type: 'User', field: 'ownerId' },
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    icon: 'Warehouse',
    defaultView: 'list',

    list: {
      columns:    ['name', 'code', 'location'],
      searchable: ['name', 'code'],
    },

    form: {
      sections: [
        {
          title: 'Warehouse Info',
          i18n:  { en: 'Warehouse Info', 'zh-TW': '倉庫資訊' },
          fields: [['name', 'code'], ['location']],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Warehouse',
      plural:  'Warehouses',
      fields: {
        name:     'Warehouse Name',
        code:     'Code',
        location: 'Location',
      },
    },
    'zh-TW': {
      caption: '倉庫',
      plural:  '倉庫管理',
      fields: {
        name:     '倉庫名稱',
        code:     '編號',
        location: '位置',
      },
    },
  },
})
