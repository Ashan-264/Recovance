import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local, but the Prisma CLI does not load it on its own.
// Load it here (falling back to .env) so migrate/studio see DATABASE_URL.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Read directly rather than via env() so `prisma generate` (run on
    // postinstall) still works when no database is configured, e.g. on Vercel.
    url: process.env.DATABASE_URL,
  },
});
