import { NextRequest, NextResponse } from "next/server";
import {
  CorosApiError,
  CorosUnavailableError,
  fetchCorosDaily,
  fetchCorosSleep,
  getCorosAuth,
} from "@/lib/coros";

// COROS sleep for a date range, shaped like Oura sleep periods (durations in
// seconds, same field names) so callers can swap records interchangeably.
// Nightly HRV and resting HR come from the Training Hub daily metrics and are
// merged in per day. Returns 503 when no COROS connection exists — callers
// treat that as "fall back to Oura".
export async function POST(req: NextRequest) {
  let start_date: string, end_date: string;
  try {
    ({ start_date, end_date } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!start_date || !end_date) {
    return NextResponse.json(
      { error: "Missing start_date or end_date" },
      { status: 400 }
    );
  }

  try {
    const auth = await getCorosAuth(req);

    const [nights, daily] = await Promise.all([
      fetchCorosSleep(auth, start_date, end_date),
      // Daily metrics only reach ~24 weeks back; their absence should not
      // sink the sleep data.
      fetchCorosDaily(auth, start_date, end_date).catch((error) => {
        console.error("COROS daily metrics fetch failed:", error);
        return [];
      }),
    ]);

    const dailyByDay = new Map(daily.map((d) => [d.day, d]));

    const data = nights
      .filter((night) => (night.totalMinutes ?? 0) > 0)
      .map((night) => {
        const metrics = dailyByDay.get(night.day);
        const totalSeconds = (night.totalMinutes ?? 0) * 60;
        const awakeSeconds = (night.awakeMinutes ?? 0) * 60;
        const inBed = totalSeconds + awakeSeconds;
        return {
          id: `coros-${night.day}`,
          day: night.day,
          type: "long_sleep",
          source: "coros",
          score: night.score,
          total_sleep_duration: totalSeconds,
          deep_sleep_duration: (night.deepMinutes ?? 0) * 60,
          rem_sleep_duration: (night.remMinutes ?? 0) * 60,
          light_sleep_duration: (night.lightMinutes ?? 0) * 60,
          awake_time: awakeSeconds,
          time_in_bed: inBed,
          efficiency: inBed > 0 ? Math.round((totalSeconds / inBed) * 100) : null,
          average_heart_rate: night.avgHeartRate,
          lowest_heart_rate: night.minHeartRate,
          average_hrv: metrics?.avgSleepHrv ?? null,
          resting_heart_rate: metrics?.restingHeartRate ?? null,
        };
      });

    return NextResponse.json({ data, source: "coros" });
  } catch (error) {
    if (error instanceof CorosUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CorosApiError) {
      return NextResponse.json(
        { error: `COROS API error: ${error.message}` },
        { status: 502 }
      );
    }
    console.error("Error reading COROS sleep data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
