import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { GarminSleepRow, toSleepRows } from "@/lib/garminCsv";

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

    // Parsed as a whole file: Garmin omits the year on recent rows, so each
    // row's year is inferred from the rows around it.
    const rows: GarminSleepRow[] = toSleepRows(
      csvData as string[][],
      new Date().getFullYear()
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid sleep records found in the uploaded file" },
        { status: 400 }
      );
    }

    const saved = await prisma.$transaction(
      rows.map((row) =>
        prisma.garminSleep.upsert({
          where: { date: row.date },
          create: row,
          update: row,
        })
      )
    );

    return NextResponse.json({
      message: "Sleep data uploaded successfully",
      records: saved.length,
    });
  } catch (error) {
    console.error("Error processing sleep data:", error);
    return NextResponse.json(
      { error: "Failed to save sleep data" },
      { status: 500 }
    );
  }
}
