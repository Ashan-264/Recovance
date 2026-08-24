import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { getProviderToken } from "./providerAccounts";
import {
  DateRange,
  formatDay,
  getCoveredRanges,
  missingRanges,
  recordCoverage,
  toUtcDay,
} from "./syncRanges";

const DATASET = "strava:activities";
const PER_PAGE = 200;
const MAX_PAGES = 50;

export class StravaUnavailableError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "StravaUnavailableError";
    this.status = status;
  }
}

interface StravaApiActivity {
  id: number;
  type?: string;
  sport_type?: string;
  name?: string;
  distance?: number;
  moving_time?: number;
  total_elevation_gain?: number;
  start_date?: string;
  [key: string]: unknown;
}

async function fetchRange(
  token: string,
  range: DateRange
): Promise<StravaApiActivity[]> {
  // Strava's `after`/`before` are exclusive bounds in epoch seconds; widen by a
  // day on each side so the inclusive range we advertise is fully covered.
  // Strava rejects a negative `after`, which a start date at or near the epoch
  // (the dashboard asks for everything from 1970-01-01) would otherwise produce.
  const after = Math.max(0, Math.floor(range.start.getTime() / 1000) - 86400);
  const before = Math.max(1, Math.floor(range.end.getTime() / 1000) + 86400);

  const activities: StravaApiActivity[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      `https://www.strava.com/api/v3/athlete/activities` +
      `?after=${after}&before=${before}&per_page=${PER_PAGE}&page=${page}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new StravaUnavailableError(
        `Strava API error: ${await response.text()}`,
        response.status
      );
    }

    const batch = (await response.json()) as StravaApiActivity[];
    activities.push(...batch);

    // A short page is the last page — no need to spend another request.
    if (batch.length < PER_PAGE) {
      break;
    }
  }

  return activities;
}

/**
 * Reads Strava activities for a date range, serving cached rows and fetching
 * only date ranges that have never been retrieved.
 */
export async function getStravaActivities(
  userId: string,
  startDate: string,
  endDate: string,
  options: { overrideToken?: string; cacheOnly?: boolean } = {}
): Promise<{
  activities: Record<string, unknown>[];
  servedFromCache: boolean;
  fetchedRanges: string[];
}> {
  const { overrideToken, cacheOnly = false } = options;

  const requested: DateRange = {
    start: toUtcDay(startDate),
    end: toUtcDay(endDate),
  };

  if (requested.end < requested.start) {
    throw new StravaUnavailableError("end_date is before start_date", 400);
  }

  // Page-load reads ask for whatever is stored and never call Strava, so an
  // empty cache renders instantly instead of blocking on a full backfill.
  if (cacheOnly) {
    return {
      activities: await readCached(userId, requested),
      servedFromCache: true,
      fetchedRanges: [],
    };
  }

  const covered = await getCoveredRanges(userId, DATASET);
  const gaps = missingRanges(requested, covered);
  const fetchedRanges: string[] = [];

  if (gaps.length > 0) {
    const token =
      overrideToken || (await getProviderToken(userId, "strava"))?.accessToken;

    if (!token) {
      const cachedOnly = await readCached(userId, requested);
      if (cachedOnly.length > 0) {
        return { activities: cachedOnly, servedFromCache: true, fetchedRanges: [] };
      }

      throw new StravaUnavailableError(
        "Not connected to Strava. Connect your account at /connect.",
        503
      );
    }

    for (const gap of gaps) {
      let activities: StravaApiActivity[];

      try {
        activities = await fetchRange(token, gap);
      } catch (error) {
        // Serve a warm cache rather than failing the page outright when
        // Strava is unreachable or the application is deactivated.
        const cachedOnly = await readCached(userId, requested);
        if (cachedOnly.length > 0) {
          return {
            activities: cachedOnly,
            servedFromCache: true,
            fetchedRanges,
          };
        }
        throw error;
      }

      const rows = activities
        .filter((activity) => activity.id && activity.start_date)
        .map((activity) => ({
          userId,
          stravaId: BigInt(activity.id),
          startDate: new Date(activity.start_date as string),
          type: activity.sport_type || activity.type || "Unknown",
          name: activity.name ?? null,
          distance: activity.distance ?? null,
          movingTime: activity.moving_time ?? null,
          totalElevationGain: activity.total_elevation_gain ?? null,
          payload: activity as Prisma.InputJsonValue,
        }));

      // Chunked so a multi-year backfill does not build one huge transaction.
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        await prisma.$transaction(
          chunk.map((row) =>
            prisma.stravaActivity.upsert({
              where: {
                userId_stravaId: { userId: row.userId, stravaId: row.stravaId },
              },
              create: row,
              update: { ...row, fetchedAt: new Date() },
            })
          )
        );
      }

      await recordCoverage(userId, DATASET, gap);
      fetchedRanges.push(`${formatDay(gap.start)}..${formatDay(gap.end)}`);
    }
  }

  return {
    activities: await readCached(userId, requested),
    servedFromCache: gaps.length === 0,
    fetchedRanges,
  };
}

async function readCached(
  userId: string,
  range: DateRange
): Promise<Record<string, unknown>[]> {
  // Include the whole end day, not just its midnight boundary.
  const end = new Date(range.end.getTime() + 86_400_000 - 1);

  const rows = await prisma.stravaActivity.findMany({
    where: { userId, startDate: { gte: range.start, lte: end } },
    orderBy: { startDate: "desc" },
    select: { payload: true },
  });

  return rows.map((row) => row.payload as Record<string, unknown>);
}
