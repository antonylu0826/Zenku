import type { UiConfig } from "@zenku/core";

export default {
    label: "Tasks",
    icon: "CheckSquare",

    list: {
        columns: ["title", "status", "dueDate", "owner"],
        defaultSort: { field: "createdAt", dir: "desc" },
    },

    form: {
        layout: [
            { field: "title", label: "Title" },
            { field: "description", label: "Description", component: "Textarea" },
            { field: "status", label: "Status" },
            { field: "dueDate", label: "Due Date" },
            { field: "ownerId", label: "Assignee" },
        ],
    },

    kanban: {
        statusField: "status",
        columns: ["TODO", "IN_PROGRESS", "DONE"],
        cardTitle: "title",
        cardSubtitle: "dueDate",
    },
} satisfies UiConfig;
