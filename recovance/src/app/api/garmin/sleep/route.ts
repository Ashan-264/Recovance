import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { serializeRows } from "@/lib/serialize";

// GET /api/garmin/sleep?start_date=&end_date=&limit=
export async function GET(req: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database is not configured. Set DATABASE_URL." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "500", 10) || 500,
      1000
    );

    const where: Prisma.GarminSleepWhereInput = {};

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const sleep = await prisma.garminSleep.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({
      sleep: serializeRows(sleep),
      count: sleep.length,
    });
  } catch (error) {
    console.error("Error fetching Garmin sleep data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sleep data" },
      { status: 500 }
    );
  }
}
