import { EntityUIConfig } from "../src/lib/types";

const PurchaseOrderUI: EntityUIConfig = {
    list: {
        columns: [
            { name: "orderNumber", label: "採購單號" },
            { name: "orderDate", label: "日期", type: "date" },
            { name: "status", label: "狀態", type: "enum" },
            { name: "supplier", label: "供應商" },
            { name: "totalAmount", label: "總金額", type: "number" },
        ],
    },
    form: {
        fields: [
            { name: "orderNumber", label: "採購單號", type: "text", required: true },
            { name: "orderDate", label: "日期", type: "date", required: true },
            { name: "status", label: "狀態", type: "enum", required: true },
            { name: "notes", label: "備註", type: "textarea" },
        ],
    },
};

export default PurchaseOrderUI;
