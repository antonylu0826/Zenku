import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        name: { type: 'String', required: true, unique: true },
        location: { type: 'String', optional: true },
    },
    relations: {
        inventory: { type: 'Inventory', isList: true },
        purchaseOrders: { type: 'PurchaseOrder', isList: true },
        salesOrders: { type: 'SalesOrder', isList: true },
    },
    access: { all: 'auth() != null' },
    ui: {
        icon: 'Warehouse',
        list: {
            columns: ['name', 'location'],
        },
    },
    i18n: {
        en: { caption: 'Warehouse', fields: { name: 'Name', location: 'Location' } },
        'zh-TW': { caption: '倉庫', fields: { name: '名稱', location: '地點' } },
    },
})
