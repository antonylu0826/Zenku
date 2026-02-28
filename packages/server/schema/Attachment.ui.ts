import type { UiConfig } from "@zenku/core";

export default {
    label: "Attachments",
    icon: "Paperclip",

    list: {
        columns: ["filename", "mimeType", "size", "entityModel", "entityId", "createdAt"],
        defaultSort: { field: "createdAt", dir: "desc" },
    },
} satisfies UiConfig;
