import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Cliente Prisma singleton del portal.
 * Importa @prisma/client DIRECTO (sin el wrapper TS de @nexus/prisma):
 * así el runtime queda externo en el bundle y Node encuentra el Query Engine.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}