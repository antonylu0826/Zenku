import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        orderNumber: { type: 'String', required: true, unique: true, default: 'cuid()' },
        date: { type: 'DateTime', required: true, default: 'now()', format: 'date' },
        status: { type: 'String', enum: 'SOStatus', default: 'DRAFT' },
        totalAmount: { type: 'Float', required: true, default: 0, format: 'C2' },
        customerId: { type: 'String', required: true },
        warehouseId: { type: 'String', required: true },
    },
    relations: {
        customer: { type: 'Customer', field: 'customerId', lookupField: 'name' },
        warehouse: { type: 'Warehouse', field: 'warehouseId', lookupField: 'name' },
        items: { type: 'SalesOrderItem', isList: true },
    },
    access: { all: 'auth() != null' },
    enums: {
        SOStatus: ['DRAFT', 'CONFIRMED', 'SHIPPED', 'CANCELLED'],
    },
    hooks: {
        afterCreate: async ({ record, ctx }) => {
            const db = ctx.db as any;
            if (record.status === 'CONFIRMED' || record.status === 'SHIPPED') {
                const items = await db.salesOrderItem.findMany({ where: { salesOrderId: record.id } });
                for (const item of items) {
                    await db.inventory.update({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: record.warehouseId } },
                        data: { quantity: { decrement: item.quantity } }
                    });
                }
            }
        }
    },
    ui: {
        icon: 'Receipt',
        list: {
            columns: ['orderNumber', 'date', 'customer', 'warehouse', 'totalAmount', 'status'],
        },
        form: {
            sections: [
                {
                    title: 'Order Info',
                    i18n: { en: 'Order Info', 'zh-TW': '訂單資訊' },
                    fields: [['orderNumber', 'date'], ['customerId', 'warehouseId'], ['status', 'totalAmount']],
                },
            ],
        },
        detail: {
            tabs: [
                { title: 'Items', i18n: { en: 'Items', 'zh-TW': '銷貨明細' }, relation: 'items', columns: ['product', 'quantity', 'unitPrice', 'amount'] }
            ]
        }
    },
    i18n: {
        en: { caption: 'Sales Order', fields: { orderNumber: 'Order No', date: 'Date', customerId: 'Customer', warehouseId: 'Source Warehouse', totalAmount: 'Total Amount', status: 'Status' } },
        'zh-TW': { caption: '銷貨單', fields: { orderNumber: '單號', date: '日期', customerId: '客戶', warehouseId: '出庫倉庫', totalAmount: '總金額', status: '狀態' } },
    },
})
