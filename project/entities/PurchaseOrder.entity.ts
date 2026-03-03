import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    orderNumber: { type: 'String', required: true, unique: true },
    orderDate:   { type: 'DateTime', default: 'now()' },
    status:      { type: 'String', enum: 'OrderStatus', default: 'DRAFT' },
    totalAmount: { type: 'Float', default: 0 },
    notes:       { type: 'String', optional: true },
    supplierId:  { type: 'String', optional: true },
    ownerId:     { type: 'String', required: true },
  },

  relations: {
    items:    { type: 'PurchaseOrderItem', isDetail: true, cascade: 'delete' },
    supplier: { type: 'Supplier', field: 'supplierId', lookupField: 'name' },
    owner:    { type: 'User', field: 'ownerId' },
  },

  enums: {
    OrderStatus: ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    icon: 'ClipboardList',
    defaultView: 'list',

    list: {
      columns:    ['orderNumber', 'orderDate', 'status', 'supplier', 'totalAmount'],
      defaultSort: { field: 'createdAt', dir: 'desc' },
    },

    form: {
      sections: [
        {
          title: 'Order Info',
          i18n:  { en: 'Order Info', 'zh-TW': '訂單資訊' },
          fields: [['orderNumber', 'orderDate'], ['status', 'supplierId'], ['notes']],
        },
        {
          title: 'Items',
          i18n:  { en: 'Items', 'zh-TW': '明細' },
          detail: 'items',
          columns: ['product', 'quantity', 'unitPrice', 'totalPrice'],
        },
      ],
    },

    detail: {
      tabs: [
        {
          title: 'Order Items',
          i18n: { en: 'Items', 'zh-TW': '採購明細' },
          relation: 'items',
          columns: ['product', 'quantity', 'unitPrice', 'totalPrice'],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Purchase Order',
      plural:  'Purchase Orders',
      fields: {
        orderNumber: 'Order Number',
        orderDate:   'Order Date',
        status:      'Status',
        totalAmount: 'Total Amount',
        notes:       'Notes',
        supplierId:  'Supplier',
        supplier:    'Supplier',
      },
    },
    'zh-TW': {
      caption: '採購單',
      plural:  '採購管理',
      fields: {
        orderNumber: '採購單號',
        orderDate:   '採購日期',
        status:      '狀態',
        totalAmount: '總金額',
        notes:       '備註',
        supplierId:  '供應商編號',
        supplier:    '供應商',
      },
    },
  },
})
