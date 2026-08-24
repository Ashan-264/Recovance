import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
  GarminSleepRow,
  parseCsv,
  toActivityRow,
  toSleepRows,
} from "@/lib/garminCsv";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

/**
 * Imports the Garmin CSV exports kept with the project, so the common case —
 * "load the export I already have" — does not require finding the file again.
 *
 * Looks in the repository root first (where the exports live), then in the app
 * directory. GET reports what is available; POST performs the import.
 */
const CANDIDATES: Record<string, string[]> = {
  activities: ["../Activities.csv", "Activities.csv"],
  sleep: ["../Sleep.csv", "Sleep.csv"],
};

function locate(dataset: string): string | null {
  for (const relative of CANDIDATES[dataset] ?? []) {
    const path = join(process.cwd(), relative);
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

export async function GET() {
  const [activities, sleep] = ["activities", "sleep"].map(locate);

  return NextResponse.json({
    available: {
      activities: Boolean(activities),
      sleep: Boolean(sleep),
    },
    files: {
      activities: activities ? activities.split("/").pop() : null,
      sleep: sleep ? sleep.split("/").pop() : null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database is not configured. Run `docker compose up -d`." },
        { status: 503 }
      );
    }

    const { dataset } = await request.json();

    if (dataset !== "activities" && dataset !== "sleep") {
      return NextResponse.json(
        { error: "dataset must be 'activities' or 'sleep'" },
        { status: 400 }
      );
    }

    const path = locate(dataset);

    if (!path) {
      return NextResponse.json(
        { error: `No saved ${dataset} export found alongside the project.` },
        { status: 404 }
      );
    }

    const rows = parseCsv(readFileSync(path, "utf8"));

    if (dataset === "activities") {
      const parsed = rows
        .map(toActivityRow)
        .filter((row): row is NonNullable<typeof row> => row !== null);

      // Later duplicates win, matching the upload endpoint.
      const byKey = new Map<string, (typeof parsed)[number]>();
      parsed.forEach((row) =>
        byKey.set(`${row.date.toISOString()}|${row.activityType}`, row)
      );

      await prisma.$transaction(
        [...byKey.values()].map((row) =>
          prisma.garminActivity.upsert({
            where: {
              date_activityType: {
                date: row.date,
                activityType: row.activityType,
              },
            },
            create: row,
            update: row,
          })
        )
      );

      return NextResponse.json({
        message: "Activity export imported",
        records: byKey.size,
        source: path.split("/").pop(),
      });
    }

    const parsed: GarminSleepRow[] = toSleepRows(rows, new Date().getFullYear());

    await prisma.$transaction(
      parsed.map((row) =>
        prisma.garminSleep.upsert({
          where: { date: row.date },
          create: row,
          update: row,
        })
      )
    );

    return NextResponse.json({
      message: "Sleep export imported",
      records: parsed.length,
      source: path.split("/").pop(),
    });
  } catch (error) {
    console.error("Error importing the saved Garmin export:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
