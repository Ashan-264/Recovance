import { NextRequest, NextResponse } from "next/server";
import {
  fetchJson,
  getOrFetch,
  NEVER_EXPIRES,
  ProviderRequestError,
} from "@/lib/providerCache";
import { getCurrentUser } from "@/lib/session";

/**
 * Detail for one activity. Cached without expiry — a completed activity does
 * not change, so re-requesting it only spends rate-limit budget.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing activity ID" }, { status: 400 });
    }

    const user = await getCurrentUser(req);
    const cacheOnly = new URL(req.url).searchParams.get("cache_only") === "1";

    const result = await getOrFetch({
      userId: user.id,
      provider: "strava",
      resource: `activity:${id}`,
      ttlSeconds: NEVER_EXPIRES,
      cacheOnly,
      fetcher: (token) =>
        fetchJson(`https://www.strava.com/api/v3/activities/${id}`, token),
    });

    if (!result) {
      return NextResponse.json({ error: "Not cached yet" }, { status: 404 });
    }

    return NextResponse.json({
      ...(result.data as object),
      cache: { hit: result.fromCache, stale: result.stale ?? false },
    });
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching activity details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
