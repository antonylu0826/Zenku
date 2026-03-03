import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        orderNumber: { type: 'String', required: true, unique: true, default: 'cuid()' },
        date: { type: 'DateTime', required: true, default: 'now()', format: 'date' },
        status: { type: 'String', enum: 'POStatus', default: 'DRAFT' },
        totalAmount: { type: 'Float', required: true, default: 0, format: 'C2' },
        notes: { type: 'String', optional: true },
        supplierId: { type: 'String', required: true },
        warehouseId: { type: 'String', required: true },
    },
    relations: {
        supplier: { type: 'Supplier', field: 'supplierId', lookupField: 'name' },
        warehouse: { type: 'Warehouse', field: 'warehouseId', lookupField: 'name' },
        items: { type: 'PurchaseOrderItem', isList: true },
    },
    access: { all: 'auth() != null' },
    enums: {
        POStatus: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
    },
    hooks: {
        afterCreate: async ({ record, ctx }) => {
            const db = ctx.db as any;
            if (record.status === 'CONFIRMED') {
                const items = await db.purchaseOrderItem.findMany({ where: { purchaseOrderId: record.id } });
                for (const item of items) {
                    await db.inventory.upsert({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: record.warehouseId } },
                        create: { productId: item.productId, warehouseId: record.warehouseId, quantity: item.quantity },
                        update: { quantity: { increment: item.quantity } }
                    });
                }
            }
        }
    },
    ui: {
        icon: 'ShoppingCart',
        list: {
            columns: ['orderNumber', 'date', 'supplier', 'warehouse', 'totalAmount', 'status'],
        },
        form: {
            sections: [
                {
                    title: 'Order Info',
                    i18n: { en: 'Order Info', 'zh-TW': '訂單資訊' },
                    fields: [['orderNumber', 'date'], ['supplierId', 'warehouseId'], ['status', 'totalAmount'], ['notes']],
                },
            ],
        },
        detail: {
            tabs: [
                { title: 'Items', i18n: { en: 'Items', 'zh-TW': '採購明細' }, relation: 'items', columns: ['product', 'quantity', 'unitPrice', 'amount'] }
            ]
        }
    },
    i18n: {
        en: { caption: 'Purchase Order', fields: { orderNumber: 'Order No', date: 'Date', supplierId: 'Supplier', warehouseId: 'Target Warehouse', totalAmount: 'Total Amount', status: 'Status' } },
        'zh-TW': { caption: '採購單', fields: { orderNumber: '單號', date: '日期', supplierId: '供應商', warehouseId: '入庫倉庫', totalAmount: '總金額', status: '狀態' } },
    },
})
