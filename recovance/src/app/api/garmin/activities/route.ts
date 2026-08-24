import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { serializeRows } from "@/lib/serialize";

// GET /api/garmin/activities?start_date=&end_date=&activity_type=&limit=
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
    const activityType = searchParams.get("activity_type");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "500", 10) || 500,
      1000
    );

    const where: Prisma.GarminActivityWhereInput = {};

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (activityType) {
      where.activityType = activityType;
    }

    const activities = await prisma.garminActivity.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({
      activities: serializeRows(activities),
      count: activities.length,
    });
  } catch (error) {
    console.error("Error fetching Garmin activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
