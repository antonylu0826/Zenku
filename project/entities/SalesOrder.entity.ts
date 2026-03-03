import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    orderNumber: { type: 'String', required: true, unique: true },
    orderDate:   { type: 'DateTime', default: 'now()' },
    status:      { type: 'String', enum: 'OrderStatus', default: 'DRAFT' },
    totalAmount: { type: 'Float', default: 0 },
    notes:       { type: 'String', optional: true },
    customerId:  { type: 'String', optional: true },
    ownerId:     { type: 'String', required: true },
  },

  enums: {
    OrderStatus: ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
  },

  relations: {
    items:    { type: 'SalesOrderItem', isDetail: true, cascade: 'delete' },
    customer: { type: 'Customer', field: 'customerId', lookupField: 'name' },
    owner:    { type: 'User', field: 'ownerId' },
  },

  access: {
    all: 'auth() != null',
  },

  ui: {
    icon: 'Receipt',
    defaultView: 'list',

    list: {
      columns:    ['orderNumber', 'orderDate', 'status', 'customer', 'totalAmount'],
      defaultSort: { field: 'createdAt', dir: 'desc' },
    },

    form: {
      sections: [
        {
          title: 'Order Info',
          i18n:  { en: 'Order Info', 'zh-TW': '訂單資訊' },
          fields: [['orderNumber', 'orderDate'], ['status', 'customerId'], ['notes']],
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
          i18n: { en: 'Items', 'zh-TW': '銷貨明細' },
          relation: 'items',
          columns: ['product', 'quantity', 'unitPrice', 'totalPrice'],
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Sales Order',
      plural:  'Sales Orders',
      fields: {
        orderNumber: 'Order Number',
        orderDate:   'Order Date',
        status:      'Status',
        totalAmount: 'Total Amount',
        notes:       'Notes',
        customerId:  'Customer',
        customer:    'Customer',
      },
    },
    'zh-TW': {
      caption: '銷貨單',
      plural:  '銷貨管理',
      fields: {
        orderNumber: '銷貨單號',
        orderDate:   '銷貨日期',
        status:      '狀態',
        totalAmount: '總金額',
        notes:       '備註',
        customerId:  '客戶編號',
        customer:    '客戶',
      },
    },
  },
})
