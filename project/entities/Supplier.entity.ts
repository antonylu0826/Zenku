import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        name: { type: 'String', required: true },
        contact: { type: 'String', optional: true },
        phone: { type: 'String', optional: true },
        address: { type: 'String', optional: true },
    },
    relations: {
        products: { type: 'Product', isList: true },
        purchaseOrders: { type: 'PurchaseOrder', isList: true },
    },
    access: { all: 'auth() != null' },
    ui: {
        icon: 'Truck',
        list: {
            columns: ['name', 'contact', 'phone'],
        },
    },
    i18n: {
        en: { caption: 'Supplier', fields: { name: 'Name', contact: 'Contact', phone: 'Phone', address: 'Address' } },
        'zh-TW': { caption: '供應商', fields: { name: '名稱', contact: '聯絡人', phone: '電話', address: '地址' } },
    },
})
