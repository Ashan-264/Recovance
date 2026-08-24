import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { toActivityRow } from "@/lib/garminCsv";

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "Database is not configured. Set DATABASE_URL and run `docker compose up -d`.",
        },
        { status: 503 }
      );
    }

    const { csvData } = await request.json();

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { error: "Invalid CSV data format" },
        { status: 400 }
      );
    }

    const rows = csvData
      .map((row: string[]) => toActivityRow(row))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid activities found in the uploaded file" },
        { status: 400 }
      );
    }

    // Upsert on (date, activityType) so re-uploading an export refreshes the
    // existing rows instead of creating duplicates.
    const saved = await prisma.$transaction(
      rows.map((row) =>
        prisma.garminActivity.upsert({
          where: {
            date_activityType: { date: row.date, activityType: row.activityType },
          },
          create: row,
          update: row,
        })
      )
    );

    return NextResponse.json({
      message: "Activity data uploaded successfully",
      records: saved.length,
      skipped: csvData.length - rows.length,
    });
  } catch (error) {
    console.error("Error processing activity data:", error);
    return NextResponse.json(
      { error: "Failed to save activity data" },
      { status: 500 }
    );
  }
}
