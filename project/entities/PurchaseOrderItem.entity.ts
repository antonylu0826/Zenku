import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        purchaseOrderId: { type: 'String', required: true },
        productId: { type: 'String', required: true },
        quantity: { type: 'Float', required: true },
        unitPrice: { type: 'Float', required: true, format: 'C2' },
        amount: { type: 'Float', optional: true, default: 0, computed: true, formula: 'quantity * unitPrice' },
    },
    relations: {
        purchaseOrder: { type: 'PurchaseOrder', field: 'purchaseOrderId', parentRelation: true, onDelete: 'Cascade' },
        product: { type: 'Product', field: 'productId', lookupField: 'name' },
    },
    access: { all: 'auth() != null' },
    i18n: {
        en: { caption: 'Purchase Item', fields: { productId: 'Product', quantity: 'Qty', unitPrice: 'Price', amount: 'Amount' } },
        'zh-TW': { caption: '採購明細', fields: { productId: '產品', quantity: '數量', unitPrice: '單價', amount: '小計' } },
    },
})
