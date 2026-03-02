import type { UiConfig } from "@zenku/core";

/**
 * UI configuration for the Product model.
 * Controls how Product is displayed in the sidebar, list, and form.
 */
export default {
    label: "Products",
    icon: "Package",

    list: {
        columns: ["name", "barcode", "spec", "size", "price", "categoryId", "inStock"],
        searchableFields: ["name"],
        defaultSort: { field: "name", dir: "asc" },
    },

    form: {
        layout: [
            { field: "name", label: "Product Name" },
            { field: "barcode", label: "Barcode" },
            { field: "spec", label: "Spec", component: "Textarea" },
            { field: "size", label: "Size" },
            { field: "price", label: "Price (USD)" },
            { field: "categoryId", label: "Category" },
            { field: "description", label: "Description", component: "Textarea" },
            { field: "inStock", label: "In Stock" },
        ],
    },
} satisfies UiConfig;
