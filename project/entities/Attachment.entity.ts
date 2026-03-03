import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    filename:    { type: 'String', required: true },
    storedName:  { type: 'String', required: true, unique: true },
    mimeType:    { type: 'String', required: true },
    size:        { type: 'Int',    required: true },
    entityModel: { type: 'String', optional: true },
    entityId:    { type: 'String', optional: true },
    url:         { type: 'String', required: true },
  },

  access: {
    read:   'auth() != null',
    create: 'auth() != null',
    delete: "auth().role == ADMIN",
  },

  ui: {
    icon: 'Paperclip',
    defaultView: 'list',

    list: {
      columns:    ['filename', 'mimeType', 'size', 'entityModel', 'entityId'],
      defaultSort: { field: 'createdAt', dir: 'desc' },
    },
  },

  i18n: {
    en: {
      caption: 'Attachment',
      plural:  'Attachments',
      fields: {
        filename:    'File Name',
        storedName:  'Stored Name',
        mimeType:    'MIME Type',
        size:        'File Size',
        entityModel: 'Entity Model',
        entityId:    'Entity ID',
        url:         'URL',
      },
    },
    'zh-TW': {
      caption: '附件',
      plural:  '附件',
      fields: {
        filename:    '檔案名稱',
        storedName:  '儲存名稱',
        mimeType:    'MIME 類型',
        size:        '檔案大小',
        entityModel: '關聯實體模型',
        entityId:    '關聯實體編號',
        url:         '檔案網址',
      },
    },
  },
})
