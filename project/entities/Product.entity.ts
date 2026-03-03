import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        sku: { type: 'String', required: true, unique: true },
        name: { type: 'String', required: true },
        categoryId: { type: 'String', required: true },
        supplierId: { type: 'String', optional: true },
        spec: { type: 'String', optional: true },
        unit: { type: 'String', required: true, default: 'PCS' },
        price: { type: 'Float', required: true, default: 0, format: 'C2' },
    },
    relations: {
        category: { type: 'Category', field: 'categoryId', lookupField: 'name' },
        defaultSupplier: { type: 'Supplier', field: 'supplierId', lookupField: 'name' },
        inventory: { type: 'Inventory', isList: true },
        purchaseItems: { type: 'PurchaseOrderItem', isList: true },
        salesItems: { type: 'SalesOrderItem', isList: true },
    },
    access: {
        create: 'auth().role == "admin"',
        read: 'auth() != null',
        update: 'auth().role == "admin"',
        delete: 'auth().role == "admin"',
    },
    ui: {
        icon: 'Package',
        list: {
            columns: ['sku', 'name', 'category', 'price', 'unit'],
            searchable: ['sku', 'name'],
            filterable: ['categoryId'],
        },
        form: {
            sections: [
                {
                    title: 'Basic Info',
                    i18n: { en: 'Basic Info', 'zh-TW': '基本資料' },
                    fields: [['sku', 'name'], ['categoryId', 'supplierId'], ['price', 'unit'], ['spec']],
                },
            ],
        },
    },
    i18n: {
        en: {
            caption: 'Product',
            fields: { sku: 'SKU', name: 'Name', spec: 'Spec', unit: 'Unit', price: 'Price', categoryId: 'Category', supplierId: 'Default Supplier' },
        },
        'zh-TW': {
            caption: '產品',
            fields: { sku: '編號', name: '名稱', spec: '規格', unit: '單位', price: '單價', categoryId: '分類', supplierId: '預設供應商' },
        },
    },
})
