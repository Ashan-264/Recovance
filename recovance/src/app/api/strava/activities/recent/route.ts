import { NextRequest, NextResponse } from "next/server";
import { getStravaActivities, StravaUnavailableError } from "@/lib/stravaCache";
import { getCurrentUser } from "@/lib/session";

/**
 * Recent activities.
 *
 * Backed by the same cache as /api/strava/activities rather than proxying
 * Strava directly, so this endpoint costs nothing when the range is already
 * stored. `after` (unix seconds) and `per_page` are kept for compatibility.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const perPage = Math.min(parseInt(searchParams.get("per_page") || "100", 10) || 100, 500);
    const after = searchParams.get("after");
    const cacheOnly = searchParams.get("cache_only") === "1";

    // Default to the last 90 days when no explicit start is given.
    const start = after
      ? new Date(parseInt(after, 10) * 1000)
      : new Date(Date.now() - 90 * 86_400_000);

    const result = await getStravaActivities(
      user.id,
      start.toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
      { cacheOnly }
    );

    return NextResponse.json(result.activities.slice(0, perPage));
  } catch (error) {
    if (error instanceof StravaUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching recent activities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
