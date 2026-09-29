import { NextRequest, NextResponse } from "next/server";
import {
  CorosApiError,
  CorosUnavailableError,
  fetchCorosActivities,
  fetchCorosDaily,
  fetchCorosHrvDashboard,
  fetchCorosSleep,
  getCorosAuth,
} from "@/lib/coros";

// Everything COROS exposes for a date range in one call: daily wellness and
// training metrics, the ~7-day HRV dashboard with baseline, the activity list,
// and sleep nights. Partial failures degrade to empty sections rather than
// failing the whole response; 503 means "not connected" (connect at /connect).
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

    const logAndEmpty = <T,>(section: string, fallback: T) => (error: unknown): T => {
      console.error(`COROS ${section} fetch failed:`, error);
      return fallback;
    };

    const [daily, hrv, activities, sleep] = await Promise.all([
      fetchCorosDaily(auth, start_date, end_date).catch(logAndEmpty("daily", [])),
      fetchCorosHrvDashboard(auth).catch(
        logAndEmpty("hrv dashboard", { baseline: null, standardDeviation: null, nights: [] })
      ),
      fetchCorosActivities(auth, start_date, end_date).catch(logAndEmpty("activities", [])),
      fetchCorosSleep(auth, start_date, end_date).catch(logAndEmpty("sleep", [])),
    ]);

    return NextResponse.json({ daily, hrv, activities, sleep });
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
    console.error("Error building COROS summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
