import { PrismaClient } from "@prisma/client";
import { enhance } from "@zenstackhq/runtime";

const prisma = new PrismaClient();

export { prisma };

export function getEnhancedPrisma(user?: { id: string; role: string }) {
  return enhance(prisma, { user });
}
