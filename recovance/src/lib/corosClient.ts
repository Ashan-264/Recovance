// Client-side helper for COROS sleep data.
//
// /api/sleep/coros returns nights shaped like Oura sleep periods (seconds,
// same field names) plus COROS-specific extras (score, resting_heart_rate).
// COROS replaces Oura per day where it has data; a 503 means "not connected",
// which callers treat as an empty result so Oura remains the source.

export interface CorosNightRecord {
  id: string;
  day: string;
  type: string;
  source: "coros";
  /** COROS sleep quality 0-100, when the watch produced one */
  score: number | null;
  total_sleep_duration: number;
  deep_sleep_duration: number;
  rem_sleep_duration: number;
  light_sleep_duration: number;
  awake_time: number;
  time_in_bed: number;
  efficiency: number | null;
  average_heart_rate: number | null;
  lowest_heart_rate: number | null;
  average_hrv: number | null;
  resting_heart_rate: number | null;
}

/** Fetches COROS nights keyed by day; empty map when not connected or on error. */
export async function fetchCorosNights(
  startDate: string,
  endDate: string
): Promise<Map<string, CorosNightRecord>> {
  try {
    const res = await fetch("/api/sleep/coros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });
    if (!res.ok) {
      if (res.status !== 503) {
        console.error("COROS sleep fetch failed:", await res.text());
      }
      return new Map();
    }
    const data = await res.json();
    return new Map(
      ((data.data || []) as CorosNightRecord[]).map((night) => [night.day, night])
    );
  } catch (error) {
    console.error("COROS sleep fetch failed:", error);
    return new Map();
  }
}
