import { defineEntity } from '@zenku/core'

export default defineEntity({
    fields: {
        name: { type: 'String', required: true, unique: true },
        description: { type: 'String', optional: true },
    },
    relations: {
        products: { type: 'Product', isList: true },
    },
    access: { all: 'auth() != null' },
    ui: {
        icon: 'Folders',
        list: {
            columns: ['name', 'description'],
        },
    },
    i18n: {
        en: { caption: 'Category', fields: { name: 'Name', description: 'Description' } },
        'zh-TW': { caption: '產品分類', fields: { name: '名稱', description: '描述' } },
    },
})
