import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    type:                 { type: 'String', required: true, enum: 'TransactionType' },
    quantity:             { type: 'Int', required: true },
    productId:            { type: 'String', required: true },
    warehouseId:          { type: 'String', optional: true },
    referenceId:          { type: 'String', optional: true },
    referenceType:        { type: 'String', optional: true },
    referenceOrderNumber: { type: 'String', optional: true },
    notes:                { type: 'String', optional: true },
    ownerId:              { type: 'String', required: true },
  },

  relations: {
    product:   { type: 'Product',   field: 'productId',   lookupField: 'code' },
    warehouse: { type: 'Warehouse', field: 'warehouseId', lookupField: 'name' },
    owner:     { type: 'User',      field: 'ownerId' },
  },

  enums: {
    TransactionType: ['PURCHASE', 'SALE', 'ADJUSTMENT'],
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    icon: 'ArrowRightLeft',
    defaultView: 'list',

    list: {
      columns:    ['type', 'referenceOrderNumber', 'product', 'warehouse', 'quantity'],
      defaultSort: { field: 'createdAt', dir: 'desc' },
    },

    form: {
      sections: [
        {
          title: 'Transaction Info',
          i18n:  { en: 'Transaction Info', 'zh-TW': '異動資訊' },
          fields: [['type', 'productId'], ['warehouseId', 'quantity'], ['referenceOrderNumber', 'referenceType'], ['notes']],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Inventory Transaction',
      plural:  'Inventory Transactions',
      fields: {
        type:                 'Type',
        quantity:             'Quantity',
        productId:            'Product',
        product:              'Product',
        warehouseId:          'Warehouse',
        warehouse:            'Warehouse',
        referenceId:          'Reference ID',
        referenceType:        'Reference Type',
        referenceOrderNumber: 'Order Number',
        notes:                'Notes',
      },
    },
    'zh-TW': {
      caption: '庫存異動',
      plural:  '庫存異動',
      fields: {
        type:                 '類型',
        quantity:             '數量',
        productId:            '產品編號',
        product:              '產品',
        warehouseId:          '倉庫編號',
        warehouse:            '倉庫',
        referenceId:          '單據編號',
        referenceType:        '單據類型',
        referenceOrderNumber: '來源單號',
        notes:                '備註',
      },
    },
  },
})
