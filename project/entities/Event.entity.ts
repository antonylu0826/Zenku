import { defineEntity } from '@zenku/core'

export default defineEntity({
  fields: {
    title:       { type: 'String', required: true },
    startDate:   { type: 'DateTime', required: true },
    endDate:     { type: 'DateTime', optional: true },
    description: { type: 'String', optional: true },
    allDay:      { type: 'Boolean', default: false },
  },

  access: {
    read:   'auth() != null',
    create: 'auth() != null',
    update: "auth().role == ADMIN",
    delete: "auth().role == ADMIN",
  },

  ui: {
    icon: 'CalendarDays',
    defaultView: 'calendar',

    list: {
      columns:    ['title', 'startDate', 'endDate', 'allDay'],
      defaultSort: { field: 'startDate', dir: 'asc' },
    },

    form: {
      sections: [
        {
          title: 'Event Info',
          i18n:  { en: 'Event Info', 'zh-TW': '事件資訊' },
          fields: [['title'], ['startDate', 'endDate'], ['allDay'], ['description']],
        },
      ],
    },

    calendar: {
      dateField:    'startDate',
      titleField:   'title',
      endDateField: 'endDate',
    },
  },

  i18n: {
    en: {
      caption: 'Event',
      plural:  'Events',
      fields: {
        title:       'Title',
        startDate:   'Start Date',
        endDate:     'End Date',
        description: 'Description',
        allDay:      'All Day',
      },
    },
    'zh-TW': {
      caption: '事件',
      plural:  '事件',
      fields: {
        title:       '標題',
        startDate:   '開始日期',
        endDate:     '結束日期',
        description: '描述',
        allDay:      '全天',
      },
    },
  },
})
