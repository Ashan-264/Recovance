/**
 * Imports Garmin CSV exports into Postgres.
 *
 *   npx tsx prisma/seed.ts                          # uses ../Activities.csv and ../Sleep.csv
 *   npx tsx prisma/seed.ts --activities path.csv    # explicit paths
 *   npx tsx prisma/seed.ts --sleep path.csv
 *
 * Safe to re-run: rows are upserted on their natural keys.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import {
  GarminSleepRow,
  toActivityRow,
  toSleepRows,
} from "../src/lib/garminCsv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

// Splits one CSV line, honouring quoted fields that contain commas.
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // escaped quote
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

// Returns data rows only; strips the header and any UTF-8 BOM.
function readCsvRows(path: string): string[][] {
  const content = readFileSync(path, "utf8").replace(/^﻿/, "");

  return content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .slice(1)
    .map(splitCsvLine);
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function importActivities(prisma: PrismaClient, path: string) {
  const rawRows = readCsvRows(path);
  const rows = rawRows
    .map(toActivityRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  // Later duplicates of the same (date, type) win, matching upload behaviour.
  const byKey = new Map<string, (typeof rows)[number]>();
  rows.forEach((row) =>
    byKey.set(`${row.date.toISOString()}|${row.activityType}`, row)
  );

  for (const row of byKey.values()) {
    await prisma.garminActivity.upsert({
      where: {
        date_activityType: { date: row.date, activityType: row.activityType },
      },
      create: row,
      update: row,
    });
  }

  console.log(
    `Activities: ${byKey.size} imported from ${rawRows.length} CSV rows ` +
      `(${rawRows.length - rows.length} unparseable, ${
        rows.length - byKey.size
      } duplicate keys)`
  );
}

async function importSleep(prisma: PrismaClient, path: string) {
  const rawRows = readCsvRows(path);
  const rows: GarminSleepRow[] = toSleepRows(rawRows, new Date().getFullYear());

  for (const row of rows) {
    await prisma.garminSleep.upsert({
      where: { date: row.date },
      create: row,
      update: row,
    });
  }

  const years = [
    ...new Set(rows.map((row) => row.date.getUTCFullYear())),
  ].sort();

  console.log(
    `Sleep: ${rows.length} day rows imported from ${rawRows.length} weekly CSV rows ` +
      `(years ${years.join(", ")})`
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy example.env to .env.local and run `docker compose up -d`."
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // Default to the CSV exports kept at the repository root.
    const activitiesPath = resolve(
      argValue("--activities") || "../Activities.csv"
    );
    const sleepPath = resolve(argValue("--sleep") || "../Sleep.csv");

    if (existsSync(activitiesPath)) {
      await importActivities(prisma, activitiesPath);
    } else {
      console.log(`Activities: skipped, no file at ${activitiesPath}`);
    }

    if (existsSync(sleepPath)) {
      await importSleep(prisma, sleepPath);
    } else {
      console.log(`Sleep: skipped, no file at ${sleepPath}`);
    }

    const [activityCount, sleepCount] = await Promise.all([
      prisma.garminActivity.count(),
      prisma.garminSleep.count(),
    ]);

    console.log(
      `Database now holds ${activityCount} activities and ${sleepCount} sleep days.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
