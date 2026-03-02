import type { UiConfig } from "@zenku/core";

/**
 * UI configuration for the Category model.
 * Controls how Category is displayed in the sidebar, list, and form.
 */
export default {
    label: "Categories",
    icon: "Tag",

    list: {
        columns: ["name", "description"],
        searchableFields: ["name", "description"],
        defaultSort: { field: "name", dir: "asc" },
    },

    form: {
        layout: [
            { field: "name", label: "Category Name", placeholder: "e.g. Electronics" },
            { field: "parentId", label: "Parent Category" },
            { field: "description", label: "Description", placeholder: "Brief description of this category", component: "Textarea" },
        ],
    },
    tree: {
        parentField: "parentId",
        labelField: "name",
    },
} satisfies UiConfig;
