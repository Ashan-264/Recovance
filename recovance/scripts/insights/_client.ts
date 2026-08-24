import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

export function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Run `docker compose up -d` and check .env.local."
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** The single-user account these scripts operate on. */
export async function resolveUserId(prisma: PrismaClient): Promise<string> {
  const withAccounts = await prisma.user.findFirst({
    where: { accounts: { some: {} } },
    orderBy: { createdAt: "asc" },
  });

  const user = withAccounts ?? (await prisma.user.findFirst({ where: { isLocal: true } }));

  if (!user) {
    throw new Error("No user found. Connect a provider at /connect first.");
  }

  return user.id;
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Reads `--flag value` from argv. */
export function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}
