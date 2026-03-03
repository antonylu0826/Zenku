import { prisma } from "./db";

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@zenku.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "Administrator";

async function main() {
  console.log("Seeding database...");

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminPassword = await Bun.password.hash(ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, name: ADMIN_NAME, password: adminPassword, role: "ADMIN" },
  });
  console.log(`Admin: ${admin.email}`);

  // ── Regular user (dev convenience) ───────────────────────────────────────
  const userPassword = await Bun.password.hash("user123");
  const user = await prisma.user.upsert({
    where: { email: "user@zenku.dev" },
    update: {},
    create: { email: "user@zenku.dev", name: "Regular User", password: userPassword, role: "USER" },
  });
  console.log(`User: ${user.email}`);

  // ── Sample categories ─────────────────────────────────────────────────────
  const electronics = await prisma.category.upsert({
    where: { id: "seed-cat-electronics" },
    update: {},
    create: { id: "seed-cat-electronics", name: "Electronics", description: "Electronic devices and gadgets" },
  });

  const books = await prisma.category.upsert({
    where: { id: "seed-cat-books" },
    update: {},
    create: { id: "seed-cat-books", name: "Books", description: "Physical and digital books" },
  });
  console.log(`Categories: ${electronics.name}, ${books.name}`);

  // ── Sample products ───────────────────────────────────────────────────────
  await prisma.product.upsert({
    where: { sku: "LAP-001" },
    update: {},
    create: { name: "Laptop Pro", price: 1299.99, sku: "LAP-001", status: "ACTIVE", categoryId: electronics.id },
  });
  await prisma.product.upsert({
    where: { sku: "MOU-001" },
    update: {},
    create: { name: "Wireless Mouse", price: 29.99, sku: "MOU-001", status: "ACTIVE", categoryId: electronics.id },
  });
  console.log("Products seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
