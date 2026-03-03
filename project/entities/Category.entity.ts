import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    name:        { type: 'String', required: true, unique: true },
    description: { type: 'String', optional: true },
    parentId:    { type: 'String', optional: true },
  },

  relations: {
    products: { type: 'Product', isList: true },
    parent:   { type: 'Category', field: 'parentId', relationName: 'CategoryTree', onDelete: 'SetNull' },
    children: { type: 'Category', isList: true, relationName: 'CategoryTree' },
  },

  access: {
    read:   'true',
    create: "auth().role == ADMIN",
    update: "auth().role == ADMIN",
    delete: "auth().role == ADMIN",
  },

  ui: {
    icon: 'Tag',
    defaultView: 'tree',

    list: {
      columns:    ['name', 'description'],
      searchable: ['name', 'description'],
      defaultSort: { field: 'name', dir: 'asc' },
    },

    form: {
      sections: [
        {
          title: 'Category Info',
          i18n:  { en: 'Category Info', 'zh-TW': '分類資訊' },
          fields: [['name'], ['parentId'], ['description']],
        },
      ],
    },

    tree: {
      parentField: 'parentId',
      labelField:  'name',
    },
  },

  i18n: {
    en: {
      caption: 'Category',
      plural:  'Categories',
      fields: {
        name:        'Category Name',
        description: 'Description',
        parentId:    'Parent Category',
        parent:      'Parent Category',
        children:    'Sub-categories',
        products:    'Products',
      },
    },
    'zh-TW': {
      caption: '產品分類',
      plural:  '產品分類',
      fields: {
        name:        '分類名稱',
        description: '描述',
        parentId:    '上層分類編號',
        parent:      '上層分類',
        children:    '子分類',
        products:    '產品列表',
      },
    },
  },
})
