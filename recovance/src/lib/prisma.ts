import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

// Reuse one client across hot reloads in dev, otherwise every reload opens a
// new connection pool and Postgres eventually refuses connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy example.env to .env.local and start the database with `docker compose up -d`."
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Connects on first use rather than at import time, so importing a module that
 * touches the database does not require DATABASE_URL to be loaded yet. CLI
 * scripts load their env after imports are hoisted, and a build should not open
 * a connection just to collect page data.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(getClient(), property);
  },
});

// True when a database connection string is configured, so routes can return
// a clear 503 instead of throwing when the database has not been set up.
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
