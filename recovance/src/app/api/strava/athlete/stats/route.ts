import { NextRequest, NextResponse } from "next/server";
import {
  fetchJson,
  getOrFetch,
  ONE_HOUR,
  ProviderRequestError,
} from "@/lib/providerCache";
import { getCurrentUser } from "@/lib/session";

interface Athlete {
  id: number;
}

/**
 * Athlete totals. Uses the signed-in Strava connection — no client token — and
 * caches for an hour, since these totals only move when a new activity lands.
 * Pass ?cache_only=1 to read without contacting Strava (page-load path).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const cacheOnly = new URL(req.url).searchParams.get("cache_only") === "1";

    const result = await getOrFetch({
      userId: user.id,
      provider: "strava",
      resource: "athlete_stats",
      ttlSeconds: ONE_HOUR,
      cacheOnly,
      fetcher: async (token) => {
        // The stats endpoint is keyed by athlete id, so resolve the athlete first.
        const athlete = await fetchJson<Athlete>(
          "https://www.strava.com/api/v3/athlete",
          token
        );
        return fetchJson(
          `https://www.strava.com/api/v3/athletes/${athlete.id}/stats`,
          token
        );
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Not cached yet" }, { status: 404 });
    }

    return NextResponse.json({
      ...(result.data as object),
      cache: {
        hit: result.fromCache,
        stale: result.stale ?? false,
        fetchedAt: result.fetchedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching athlete stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
