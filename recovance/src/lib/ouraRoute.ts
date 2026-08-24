import { NextRequest, NextResponse } from "next/server";
import {
  getOuraDaily,
  getOuraSleepPeriods,
  OuraDailyDataset,
  OuraUnavailableError,
} from "./ouraCache";
import { getCurrentUser } from "./session";

type Reader = (
  userId: string,
  startDate: string,
  endDate: string
) => Promise<{ data: Record<string, unknown>[]; servedFromCache: boolean; fetchedRanges: string[] }>;

/**
 * Shared handler for the Oura proxy routes.
 *
 * The response shape ({ data, next_token }) matches what these endpoints
 * returned when they proxied Oura directly, so existing callers are unchanged.
 * `next_token` is always null because pagination is exhausted while filling
 * the cache.
 */
function createHandler(read: Reader) {
  return async function POST(req: NextRequest) {
    try {
      const { start_date, end_date } = await req.json();

      if (!start_date || !end_date) {
        return NextResponse.json(
          { error: "Missing start_date or end_date" },
          { status: 400 }
        );
      }

      const user = await getCurrentUser(req);
      const result = await read(user.id, start_date, end_date);

      return NextResponse.json({
        data: result.data,
        next_token: null,
        cache: {
          hit: result.servedFromCache,
          fetched: result.fetchedRanges,
        },
      });
    } catch (error) {
      if (error instanceof OuraUnavailableError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }

      console.error("Error reading Oura data:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

export function createOuraDailyRoute(dataset: OuraDailyDataset) {
  return createHandler((userId, startDate, endDate) =>
    getOuraDaily(userId, dataset, startDate, endDate)
  );
}

export function createOuraSleepPeriodsRoute() {
  return createHandler(getOuraSleepPeriods);
}
