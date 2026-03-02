import { prisma } from "./db";

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await Bun.password.hash("admin123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@zenku.dev" },
    update: {},
    create: {
      email: "admin@zenku.dev",
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // Create regular user
  const userPassword = await Bun.password.hash("user123");
  const user = await prisma.user.upsert({
    where: { email: "user@zenku.dev" },
    update: {},
    create: {
      email: "user@zenku.dev",
      name: "Regular User",
      password: userPassword,
      role: "USER",
    },
  });
  console.log(`Regular user: ${user.email}`);

  // Create categories
  const electronics = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: { name: "Electronics", description: "Electronic devices and gadgets" },
  });

  const books = await prisma.category.upsert({
    where: { name: "Books" },
    update: {},
    create: { name: "Books", description: "Physical and digital books" },
  });

  console.log(`Categories: ${electronics.name}, ${books.name}`);

  // Create Warehouses
  const mainWH = await prisma.warehouse.upsert({
    where: { code: "WH-001" },
    update: {},
    create: { name: "台北總庫", code: "WH-001", location: "台北市內湖區", ownerId: admin.id },
  });
  const subWH = await prisma.warehouse.upsert({
    where: { code: "WH-002" },
    update: {},
    create: { name: "台中分庫", code: "WH-002", location: "台中市西屯區", ownerId: admin.id },
  });
  console.log("Warehouses seeded");

  // Create Suppliers
  const supplierA = await prisma.supplier.upsert({
    where: { code: "SUP-001" },
    update: {},
    create: {
      name: "力晶電子股份有限公司",
      code: "SUP-001",
      contactName: "陳經理",
      phone: "02-2790-1234",
      taxId: "12345678",
      ownerId: admin.id
    },
  });
  console.log("Suppliers seeded");

  // Create Customers
  const customerA = await prisma.customer.upsert({
    where: { code: "CUST-001" },
    update: {},
    create: {
      name: "國立台灣大學",
      code: "CUST-001",
      contactName: "王教授",
      phone: "02-3366-4321",
      ownerId: admin.id
    },
  });
  console.log("Customers seeded");

  // Create products
  const products = [
    {
      code: "ELEC-001",
      name: "Wireless Mouse",
      price: 29.99,
      description: "Ergonomic wireless mouse",
      isPublic: true,
      categoryId: electronics.id,
      ownerId: admin.id,
    },
    {
      code: "ELEC-002",
      name: "Mechanical Keyboard",
      price: 89.99,
      description: "RGB mechanical keyboard",
      isPublic: true,
      categoryId: electronics.id,
      ownerId: admin.id,
    },
    {
      code: "BOOK-001",
      name: "TypeScript Handbook",
      price: 39.99,
      description: "Complete guide to TypeScript",
      isPublic: true,
      categoryId: books.id,
      ownerId: admin.id,
    },
    {
      code: "ELEC-003",
      name: "Internal Prototype Board",
      price: 199.99,
      description: "Not for public listing",
      isPublic: false,
      categoryId: electronics.id,
      ownerId: admin.id,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  console.log(`Products seeded: ${products.length}`);

  // ─── Tasks (Kanban demo) ────────────────────────────────────────────────────
  const tasks = [
    { title: "Design system", status: "DONE" as const, ownerId: admin.id },
    { title: "Implement auth", status: "DONE" as const, ownerId: admin.id },
    { title: "Build CRUD API", status: "IN_PROGRESS" as const, ownerId: admin.id },
    { title: "Add integration tests", status: "IN_PROGRESS" as const, ownerId: user.id },
    { title: "Deploy to Docker", status: "TODO" as const, ownerId: admin.id },
    { title: "Write documentation", status: "TODO" as const, ownerId: user.id },
  ];

  await prisma.task.deleteMany();
  await prisma.task.createMany({ data: tasks });
  console.log(`Tasks seeded: ${tasks.length}`);

  // ─── Events (Calendar demo) ─────────────────────────────────────────────────
  const now = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  await prisma.event.deleteMany();
  await prisma.event.createMany({
    data: [
      { title: "Sprint Planning", startDate: addDays(now, 1), endDate: addDays(now, 1) },
      { title: "Design Review", startDate: addDays(now, 3), endDate: addDays(now, 3) },
      { title: "Product Demo", startDate: addDays(now, 7), allDay: true },
      { title: "Retrospective", startDate: addDays(now, 14), endDate: addDays(now, 14) },
      { title: "Team Offsite", startDate: addDays(now, -3), endDate: addDays(now, -1), allDay: true },
    ],
  });
  console.log("Events seeded: 5");

  // ─── Category tree (TreeList demo) ─────────────────────────────────────────
  for (const name of ["Smartphones", "Laptops", "Accessories"]) {
    await prisma.category.upsert({
      where: { name },
      update: { parentId: electronics.id },
      create: { name, parentId: electronics.id },
    });
  }
  console.log("Category tree seeded");

  // ─── Purchase Orders ────────────────────────────────────────────────────────
  const po1 = await prisma.purchaseOrder.upsert({
    where: { orderNumber: "PO-20240301" },
    update: {},
    create: {
      orderNumber: "PO-20240301",
      status: "COMPLETED",
      supplierId: supplierA.id,
      totalAmount: 299.9,
      ownerId: admin.id,
      items: {
        create: [
          { productId: (await prisma.product.findUnique({ where: { code: "ELEC-001" } }))!.id, quantity: 10, unitPrice: 29.99 }
        ]
      }
    }
  });
  console.log("Example Purchase Order seeded");

  // ─── Inventory Transactions ────────────────────────────────────────────────
  // Add stock for the completed PO
  await prisma.inventoryTransaction.create({
    data: {
      type: "PURCHASE",
      quantity: 10,
      productId: (await prisma.product.findUnique({ where: { code: "ELEC-001" } }))!.id,
      warehouseId: mainWH.id,
      referenceId: po1.id,
      referenceType: "PurchaseOrder",
      ownerId: admin.id,
      notes: "初始入庫範例"
    }
  });

  // Update product stock quantity
  await prisma.product.update({
    where: { code: "ELEC-001" },
    data: { stockQuantity: 10 }
  });

  console.log("\nSeed completed!");
  console.log("Admin login: admin@zenku.dev / admin123");
  console.log("User login:  user@zenku.dev / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
