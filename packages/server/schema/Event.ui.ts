import type { UiConfig } from "@zenku/core";

export default {
    label: "Events",
    icon: "CalendarDays",

    list: {
        columns: ["title", "startDate", "endDate", "allDay"],
        defaultSort: { field: "startDate", dir: "asc" },
    },

    form: {
        layout: [
            { field: "title", label: "Title" },
            { field: "startDate", label: "Start Date" },
            { field: "endDate", label: "End Date" },
            { field: "allDay", label: "All Day" },
            { field: "description", label: "Description", component: "Textarea" },
        ],
    },

    calendar: {
        dateField: "startDate",
        titleField: "title",
        endDateField: "endDate",
    },
} satisfies UiConfig;
