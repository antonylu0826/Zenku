import { EntityUIConfig } from "../src/lib/types";

const InventoryTransactionUI: EntityUIConfig = {
    list: {
        columns: [
            { name: "type", label: "類型", type: "enum" },
            { name: "referenceOrderNumber", label: "單號" },
            { name: "productId", label: "品號", type: "relation", relationEntity: "Product", relationField: "code" },
            { name: "warehouseId", label: "倉庫", type: "relation", relationEntity: "Warehouse", relationField: "name" },
            { name: "quantity", label: "數量", type: "number" },
        ],
    },
};

export default InventoryTransactionUI;
