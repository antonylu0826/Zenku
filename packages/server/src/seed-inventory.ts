import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Inventory System Example Data...");

    // 1. Users
    const adminPassword = await Bun.password.hash("admin123");
    const admin = await prisma.user.upsert({
        where: { email: "admin@zenku.dev" },
        update: {},
        create: { email: "admin@zenku.dev", name: "Administrator", password: adminPassword, role: "ADMIN" },
    });

    // 2. Categories
    const catElectronics = await prisma.category.upsert({
        where: { name: "電子產品" },
        update: {},
        create: { name: "電子產品", description: "各式電子設備與配件" },
    });

    const catStationery = await prisma.category.upsert({
        where: { name: "辦公用品" },
        update: {},
        create: { name: "辦公用品", description: "文具、紙張等辦公耗材" },
    });

    // 3. Warehouses
    const whMain = await prisma.warehouse.upsert({
        where: { name: "總倉" },
        update: {},
        create: { name: "總倉", location: "台北市大安區" },
    });

    const whTaipei = await prisma.warehouse.upsert({
        where: { name: "台北門市倉" },
        update: {},
        create: { name: "台北門市倉", location: "台北市信義區" },
    });

    // 4. Suppliers
    const supGlobal = await prisma.supplier.upsert({
        where: { id: "seed-sup-1" },
        update: {},
        create: { id: "seed-sup-1", name: "環球科技股份有限公司", contact: "張經理", phone: "02-12345678" },
    });

    const supOffice = await prisma.supplier.upsert({
        where: { id: "seed-sup-2" },
        update: {},
        create: { id: "seed-sup-2", name: "優質辦公耗材供貨商", contact: "李小姐", phone: "02-87654321" },
    });

    // 5. Customers
    await prisma.customer.upsert({
        where: { id: "seed-cus-1" },
        update: {},
        create: { id: "seed-cus-1", name: "個人工作室", contact: "王小明", phone: "0912-345678" },
    });

    // 6. Products
    const prodLaptop = await prisma.product.upsert({
        where: { sku: "LAP-001" },
        update: {},
        create: {
            sku: "LAP-001",
            name: "商務筆記型電腦",
            spec: "14吋 / i7 / 16GB / 512GB SSD",
            unit: "台",
            price: 32000,
            categoryId: catElectronics.id,
            supplierId: supGlobal.id
        },
    });

    const prodMouse = await prisma.product.upsert({
        where: { sku: "MOU-001" },
        update: {},
        create: {
            sku: "MOU-001",
            name: "無線人體工學滑鼠",
            spec: "藍牙/2.4G 雙模",
            unit: "個",
            price: 850,
            categoryId: catElectronics.id,
            supplierId: supGlobal.id
        },
    });

    const prodPaper = await prisma.product.upsert({
        where: { sku: "PAP-A4" },
        update: {},
        create: {
            sku: "PAP-A4",
            name: "影印紙 A4 70g",
            spec: "500張/包",
            unit: "包",
            price: 120,
            categoryId: catStationery.id,
            supplierId: supOffice.id
        },
    });

    console.log("Example data seeded successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
