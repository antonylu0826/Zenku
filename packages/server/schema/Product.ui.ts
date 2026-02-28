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
            { field: "name", label: "Product Name", placeholder: "e.g. iPhone 16" },
            { field: "barcode", label: "Barcode", placeholder: "e.g. 1234567890128" },
            { field: "spec", label: "Spec", placeholder: "e.g. 128GB / Space Black", component: "Textarea" },
            { field: "size", label: "Size", placeholder: "e.g. 15cm x 7cm x 0.8cm" },
            { field: "price", label: "Price (USD)", placeholder: "0.00" },
            { field: "categoryId", label: "Category" },
            { field: "description", label: "Description", placeholder: "Detailed product description", component: "Textarea" },
            { field: "inStock", label: "In Stock" },
        ],
    },
} satisfies UiConfig;
