import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        productId: { type: 'String', required: true },
        warehouseId: { type: 'String', required: true },
        quantity: { type: 'Float', required: true, default: 0 },
    },
    relations: {
        product: { type: 'Product', field: 'productId', lookupField: 'name' },
        warehouse: { type: 'Warehouse', field: 'warehouseId', lookupField: 'name' },
    },
    access: { all: 'auth() != null' },
    ui: {
        icon: 'Boxes',
        list: {
            columns: ['product', 'warehouse', 'quantity'],
            filterable: ['warehouseId', 'productId'],
        },
    },
    i18n: {
        en: { caption: 'Inventory', fields: { productId: 'Product', warehouseId: 'Warehouse', quantity: 'Quantity' } },
        'zh-TW': { caption: '庫存狀態', fields: { productId: '產品', warehouseId: '倉庫', quantity: '庫存數量' } },
    },
})
