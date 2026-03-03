import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    name:        { type: 'String', required: true },
    code:        { type: 'String', optional: true, unique: true },
    contactName: { type: 'String', optional: true },
    phone:       { type: 'String', optional: true },
    email:       { type: 'String', optional: true },
    address:     { type: 'String', optional: true },
    ownerId:     { type: 'String', required: true },
  },

  relations: {
    salesOrders: { type: 'SalesOrder', isList: true },
    owner:       { type: 'User', field: 'ownerId' },
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    icon: 'Users',
    defaultView: 'list',

    list: {
      columns:    ['name', 'code', 'contactName', 'phone', 'email'],
      searchable: ['name', 'code'],
    },

    form: {
      sections: [
        {
          title: 'Customer Info',
          i18n:  { en: 'Customer Info', 'zh-TW': '客戶資訊' },
          fields: [['name', 'code'], ['contactName', 'phone'], ['email'], ['address']],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Customer',
      plural:  'Customers',
      fields: {
        name:        'Customer Name',
        code:        'Customer Code',
        contactName: 'Contact Name',
        phone:       'Phone',
        email:       'Email',
        address:     'Address',
      },
    },
    'zh-TW': {
      caption: '客戶',
      plural:  '客戶管理',
      fields: {
        name:        '客戶名稱',
        code:        '客戶代碼',
        contactName: '聯絡人',
        phone:       '電話',
        email:       '電子郵件',
        address:     '地址',
      },
    },
  },
})
