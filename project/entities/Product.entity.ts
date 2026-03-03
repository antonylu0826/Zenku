import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    code:          { type: 'String', required: true, unique: true },
    barcode:       { type: 'String', optional: true },
    spec:          { type: 'String', optional: true },
    size:          { type: 'String', optional: true },
    name:          { type: 'String', required: true },
    price:         { type: 'Float',  required: true },
    stockQuantity: { type: 'Int',    default: 0 },
    totalValue:    { type: 'Float',  optional: true, computed: true, formula: 'price * stockQuantity' },
    description:   { type: 'String', optional: true },
    isPublic:      { type: 'Boolean', default: true },
    categoryId:    { type: 'String', required: true },
    ownerId:       { type: 'String', required: true },
  },

  relations: {
    category:              { type: 'Category', field: 'categoryId', lookupField: 'name' },
    owner:                 { type: 'User',     field: 'ownerId' },
    purchaseOrderItems:    { type: 'PurchaseOrderItem', isList: true },
    salesOrderItems:       { type: 'SalesOrderItem', isList: true },
    inventoryTransactions: { type: 'InventoryTransaction', isList: true },
  },

  access: {
    read:   'auth().role == ADMIN || isPublic',
    create: "auth().role == ADMIN",
    update: "auth().role == ADMIN",
    delete: "auth().role == ADMIN",
  },

  ui: {
    icon: 'Package',
    defaultView: 'list',

    fields: {
      price:       { component: 'CurrencyField' },
      description: { component: 'TextareaField' },
      spec:        { component: 'TextareaField' },
    },

    list: {
      columns:    ['name', 'barcode', 'spec', 'size', 'price', 'category'],
      searchable: ['name'],
      defaultSort: { field: 'name', dir: 'asc' },
    },

    form: {
      sections: [
        {
          title: 'Basic Info',
          i18n:  { en: 'Basic Info', 'zh-TW': '基本資料' },
          fields: [['name', 'code'], ['barcode', 'size'], ['price', 'categoryId'], ['spec']],
        },
        {
          title: 'Description',
          i18n:  { en: 'Description', 'zh-TW': '說明' },
          fields: [['description']],
          collapsible: true,
        },
      ],
    },
  },

  i18n: {
    en: {
      caption: 'Product',
      plural:  'Products',
      fields: {
        code:          'Product Code',
        barcode:       'Barcode',
        spec:          'Spec',
        size:          'Size',
        name:          'Product Name',
        price:         'Price',
        stockQuantity: 'Stock Quantity',
        totalValue:    'Total Value',
        description:   'Description',
        isPublic:      'Is Public',
        categoryId:    'Category',
        category:      'Category',
        ownerId:       'Owner',
        owner:         'Owner',
      },
    },
    'zh-TW': {
      caption: '產品',
      plural:  '產品',
      fields: {
        code:          '產品代碼',
        barcode:       '條碼',
        spec:          '規格',
        size:          '尺寸',
        name:          '產品名稱',
        price:         '價格',
        stockQuantity: '庫存數量',
        totalValue:    '總價值',
        description:   '描述',
        isPublic:      '是否公開',
        categoryId:    '分類編號',
        category:      '產品分類',
        ownerId:       '擁有者編號',
        owner:         '擁有者',
      },
    },
  },
})
