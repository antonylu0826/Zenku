import { EntityUIConfig } from "../src/lib/types";

const SalesOrderUI: EntityUIConfig = {
    list: {
        columns: [
            { name: "orderNumber", label: "銷貨單號" },
            { name: "orderDate", label: "日期", type: "date" },
            { name: "status", label: "狀態", type: "enum" },
            { name: "customer", label: "客戶" },
            { name: "totalAmount", label: "總金額", type: "number" },
        ],
    },
    form: {
        fields: [
            { name: "orderNumber", label: "銷貨單號", type: "text", required: true },
            { name: "orderDate", label: "日期", type: "date", required: true },
            { name: "status", label: "狀態", type: "enum", required: true },
            { name: "notes", label: "備註", type: "textarea" },
        ],
    },
};

export default SalesOrderUI;
