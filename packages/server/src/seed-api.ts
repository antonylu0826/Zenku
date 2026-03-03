
const API_BASE = "http://localhost:3001/api";
const LOGIN_URL = "http://localhost:3001/api/auth/login";

async function seed() {
    console.log("Starting API-based seeding...");

    // 1. Login to get Token
    const loginRes = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@zenku.dev", password: "admin123" }),
    });

    if (!loginRes.ok) {
        const errorText = await loginRes.text();
        console.error(`Login failed with status ${loginRes.status}: ${errorText}`);
        console.error("Make sure the server is running on http://localhost:3001");
        process.exit(1);
    }

    const { token } = await loginRes.json();
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    // Helper to post data
    const post = async (path, data) => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) {
            console.error(`Error posting to ${path}:`, result);
            return null;
        }
        return result;
    };

    console.log("Creating Categories...");
    const cat1 = await post("/category", { name: "電子產品", description: "Electronic devices" });
    const cat2 = await post("/category", { name: "辦公用品", description: "Office supplies" });

    console.log("Creating Suppliers...");
    const sup1 = await post("/supplier", { name: "緯創資通", contact: "王經理", phone: "02-12345678" });

    console.log("Creating Customers...");
    const cus1 = await post("/customer", { name: "台積電", contact: "李主任", phone: "03-5123456" });

    console.log("Creating Warehouses...");
    const wh1 = await post("/warehouse", { name: "台北一號倉", location: "內湖區" });

    if (cat1 && sup1) {
        console.log("Creating Products...");
        await post("/product", {
            sku: "PROD-001",
            name: "高效能筆電",
            categoryId: cat1.id,
            supplierId: sup1.id,
            price: 45000,
            unit: "台",
            spec: "16G RAM / 1T SSD"
        });

        await post("/product", {
            sku: "PROD-002",
            name: "人體工學椅",
            categoryId: cat2.id,
            supplierId: sup1.id,
            price: 12000,
            unit: "張",
            spec: "黑色 / 網椅"
        });
    }

    console.log("API-based seeding completed!");
}

seed().catch(console.error);
