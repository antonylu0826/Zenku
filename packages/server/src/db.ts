import { PrismaClient } from "@prisma/client";
import { enhance } from "@zenstackhq/runtime";

// Auto-construct DATABASE_URL from DB_* env vars if not explicitly set.
// This allows the root .env to use individual components (DB_PROVIDER, DB_HOST, etc.)
// instead of a single opaque connection string.
if (!process.env.DATABASE_URL) {
  const provider = process.env.DB_PROVIDER ?? "sqlite";
  if (provider === "postgresql") {
    const host = process.env.DB_HOST ?? "localhost";
    const port = process.env.DB_PORT ?? "5432";
    const name = process.env.DB_NAME ?? "zenku";
    const user = process.env.DB_USER ?? "postgres";
    const pass = process.env.DB_PASSWORD ?? "";
    process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  } else {
    const file = process.env.DB_FILE ?? "./prisma/dev.db";
    process.env.DATABASE_URL = file.startsWith("file:") ? file : `file:${file}`;
  }
}

const prisma = new PrismaClient();

export { prisma };

export function getEnhancedPrisma(user?: { id: string; role: string }) {
  return enhance(prisma, { user });
}
