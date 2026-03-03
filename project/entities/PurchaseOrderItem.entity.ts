import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    orderId:    { type: 'String', required: true },
    productId:  { type: 'String', required: true },
    quantity:   { type: 'Int',   required: true },
    unitPrice:  { type: 'Float', required: true },
    totalPrice: { type: 'Float', optional: true, computed: true, formula: 'quantity * unitPrice' },
  },

  relations: {
    order:   { type: 'PurchaseOrder', field: 'orderId', onDelete: 'Cascade', parentRelation: true },
    product: { type: 'Product', field: 'productId', lookupField: 'name' },
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    list: {
      columns: ['product', 'quantity', 'unitPrice', 'totalPrice'],
    },
  },

  i18n: {
    en: {
      caption: 'Purchase Order Item',
      plural:  'Purchase Order Items',
      fields: {
        productId:  'Product',
        product:    'Product',
        quantity:   'Quantity',
        unitPrice:  'Unit Price',
        totalPrice: 'Subtotal',
      },
    },
    'zh-TW': {
      caption: '採購明細',
      plural:  '採購明細',
      fields: {
        productId:  '產品編號',
        product:    '產品',
        quantity:   '數量',
        unitPrice:  '單價',
        totalPrice: '小計',
      },
    },
  },
})
