import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        name: { type: 'String', required: true },
        contact: { type: 'String', optional: true },
        phone: { type: 'String', optional: true },
        address: { type: 'String', optional: true },
    },
    relations: {
        salesOrders: { type: 'SalesOrder', isList: true },
    },
    access: { all: 'auth() != null' },
    ui: {
        icon: 'Users',
        list: {
            columns: ['name', 'contact', 'phone'],
        },
    },
    i18n: {
        en: { caption: 'Customer', fields: { name: 'Name', contact: 'Contact', phone: 'Phone', address: 'Address' } },
        'zh-TW': { caption: '客戶', fields: { name: '客戶名稱', contact: '聯絡人', phone: '電話', address: '地址' } },
    },
})
