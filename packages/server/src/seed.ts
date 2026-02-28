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
