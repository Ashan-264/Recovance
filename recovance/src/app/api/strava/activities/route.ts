import { NextRequest, NextResponse } from "next/server";

interface StravaActivity {
  id: number;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
  upload_id?: number;
  external_id?: string;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id?: string;
  start_latlng?: number[];
  end_latlng?: number[];
  average_temp?: number;
  average_grade_adjusted_speed?: number;
  average_grade?: number;
  positive_elevation_gain?: number;
  negative_elevation_gain?: number;
  calories?: number;
  description?: string;
  photos?: unknown;
  gear?: unknown;
  device_name?: string;
  embed_token?: string;
  splits_metric?: unknown[];
  splits_standard?: unknown[];
  laps?: unknown[];
  best_efforts?: unknown[];
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map?: unknown;
  has_kudoed: boolean;
  hide_from_home: boolean;
  workout_type?: number;
  suffer_score?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { access_token, start_date, end_date } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: "Strava access token is required" },
        { status: 400 }
      );
    }

    const startTimestamp = Math.floor(new Date(start_date).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(end_date).getTime() / 1000);

    let allActivities: StravaActivity[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&before=${endTimestamp}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Strava API error: ${errorText}` },
          { status: response.status }
        );
      }

      const activities: StravaActivity[] = await response.json();

      // If no more activities, break the loop
      if (activities.length === 0) {
        break;
      }

      allActivities = allActivities.concat(activities);
      page++;

      // Safety check to prevent infinite loops
      if (page > 50) {
        console.warn("Reached maximum page limit (50), stopping pagination");
        break;
      }
    }

    console.log(`Total activities fetched: ${allActivities.length}`);
    return NextResponse.json({ activities: allActivities });
  } catch (error) {
    console.error("Error fetching Strava activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch Strava activities" },
      { status: 500 }
    );
  }
}
