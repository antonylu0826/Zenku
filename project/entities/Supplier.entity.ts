import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    name:        { type: 'String', required: true },
    code:        { type: 'String', optional: true, unique: true },
    contactName: { type: 'String', optional: true },
    phone:       { type: 'String', optional: true },
    email:       { type: 'String', optional: true },
    address:     { type: 'String', optional: true },
    taxId:       { type: 'String', optional: true },
    ownerId:     { type: 'String', required: true },
  },

  relations: {
    purchaseOrders: { type: 'PurchaseOrder', isList: true },
    owner:          { type: 'User', field: 'ownerId' },
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    icon: 'Truck',
    defaultView: 'list',

    list: {
      columns:    ['name', 'code', 'contactName', 'phone', 'email'],
      searchable: ['name', 'code'],
    },

    form: {
      sections: [
        {
          title: 'Supplier Info',
          i18n:  { en: 'Supplier Info', 'zh-TW': '供應商資訊' },
          fields: [['name', 'code'], ['contactName', 'phone'], ['email', 'taxId'], ['address']],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Supplier',
      plural:  'Suppliers',
      fields: {
        name:        'Supplier Name',
        code:        'Supplier Code',
        contactName: 'Contact Name',
        phone:       'Phone',
        email:       'Email',
        address:     'Address',
        taxId:       'Tax ID',
      },
    },
    'zh-TW': {
      caption: '供應商',
      plural:  '供應商管理',
      fields: {
        name:        '供應商名稱',
        code:        '供應商代碼',
        contactName: '聯絡人',
        phone:       '電話',
        email:       '電子郵件',
        address:     '地址',
        taxId:       '統一編號',
      },
    },
  },
})
