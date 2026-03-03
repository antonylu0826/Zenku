import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    title:       { type: 'String', required: true },
    description: { type: 'String', optional: true },
    status:      { type: 'String', enum: 'TaskStatus', default: 'TODO' },
    dueDate:     { type: 'DateTime', optional: true },
    ownerId:     { type: 'String', required: true },
  },

  relations: {
    owner: { type: 'User', field: 'ownerId', lookupField: 'name' },
  },

  enums: {
    TaskStatus: ['TODO', 'IN_PROGRESS', 'DONE'],
  },

  access: {
    read:   'auth() != null',
    create: 'auth() != null',
    update: "auth().role == ADMIN",
    delete: "auth().role == ADMIN",
  },

  ui: {
    icon: 'CheckSquare',
    defaultView: 'kanban',

    list: {
      columns:    ['title', 'status', 'dueDate', 'owner'],
      defaultSort: { field: 'createdAt', dir: 'desc' },
    },

    form: {
      sections: [
        {
          title: 'Task Info',
          i18n:  { en: 'Task Info', 'zh-TW': '任務資訊' },
          fields: [['title'], ['description'], ['status', 'dueDate'], ['ownerId']],
        },
      ],
    },

    kanban: {
      statusField: 'status',
      columns:     ['TODO', 'IN_PROGRESS', 'DONE'],
      cardTitle:   'title',
      cardSubtitle: 'dueDate',
    },
  },

  i18n: {
    en: {
      caption: 'Task',
      plural:  'Tasks',
      fields: {
        title:       'Title',
        description: 'Description',
        status:      'Status',
        dueDate:     'Due Date',
        ownerId:     'Owner',
        owner:       'Owner',
      },
    },
    'zh-TW': {
      caption: '任務',
      plural:  '任務',
      fields: {
        title:       '標題',
        description: '描述',
        status:      '狀態',
        dueDate:     '截止日期',
        ownerId:     '擁有者編號',
        owner:       '擁有者',
      },
    },
  },
})
