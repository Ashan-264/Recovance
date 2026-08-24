import { NextRequest, NextResponse } from "next/server";
import { getStravaActivities, StravaUnavailableError } from "@/lib/stravaCache";
import { getCurrentUser } from "@/lib/session";

/**
 * Returns Strava activities for a date range.
 *
 * Reads from the local cache first and fetches only date ranges that have
 * never been retrieved. `access_token` in the body is still honoured for
 * callers that hold a token client-side, but is no longer required once the
 * account is connected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, start_date, end_date, cache_only, slim } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser(request);

    const result = await getStravaActivities(user.id, start_date, end_date, {
      overrideToken:
        typeof access_token === "string" && access_token ? access_token : undefined,
      cacheOnly: cache_only === true,
    });

    // Slim mode keeps only the fields the pages read (~70% smaller): full
    // payloads stay available to callers that ask for them.
    const activities =
      slim === true
        ? result.activities.map((activity) => {
            const a = activity as Record<string, unknown>;
            const map = a.map as { summary_polyline?: string } | null;
            return {
              id: a.id,
              type: a.sport_type ?? a.type,
              name: a.name,
              distance: a.distance,
              moving_time: a.moving_time,
              elapsed_time: a.elapsed_time,
              total_elevation_gain: a.total_elevation_gain,
              start_date: a.start_date,
              start_date_local: a.start_date_local,
              average_speed: a.average_speed,
              max_speed: a.max_speed,
              average_heartrate: a.average_heartrate,
              max_heartrate: a.max_heartrate,
              suffer_score: a.suffer_score,
              start_latlng: a.start_latlng,
              end_latlng: a.end_latlng,
              map: map?.summary_polyline
                ? { summary_polyline: map.summary_polyline }
                : null,
            };
          })
        : result.activities;

    return NextResponse.json({
      activities,
      cache: { hit: result.servedFromCache, fetched: result.fetchedRanges },
    });
  } catch (error) {
    if (error instanceof StravaUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error fetching Strava activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch Strava activities" },
      { status: 500 }
    );
  }
}
