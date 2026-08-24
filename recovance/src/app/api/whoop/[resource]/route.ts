import { NextRequest, NextResponse } from "next/server";
import {
  fetchJson,
  getOrFetch,
  ONE_HOUR,
  ProviderRequestError,
} from "@/lib/providerCache";
import { getCurrentUser } from "@/lib/session";

// Supported: /api/whoop/recovery, sleep, workout, cycle, profile
const RESOURCE_PATHS: Record<string, string> = {
  recovery: "v2/recovery",
  sleep: "v2/activity/sleep",
  workout: "v2/activity/workout",
  cycle: "v2/cycle",
  profile: "v2/user/profile/basic",
};

// A profile changes rarely; collections are re-checked hourly.
const TTL: Record<string, number> = {
  profile: 24 * ONE_HOUR,
};

/**
 * WHOOP proxy backed by the signed-in connection and the provider cache.
 * The client no longer supplies a token; pass ?cache_only=1 to read stored data
 * without contacting WHOOP.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const resourcePath = RESOURCE_PATHS[resource];

    if (!resourcePath) {
      return NextResponse.json(
        {
          error: `Unknown WHOOP resource: ${resource}. Supported: ${Object.keys(
            RESOURCE_PATHS
          ).join(", ")}`,
        },
        { status: 404 }
      );
    }

    const user = await getCurrentUser(req);
    const requestUrl = new URL(req.url);
    const cacheOnly = requestUrl.searchParams.get("cache_only") === "1";

    // Query params are part of the cache key so different windows do not
    // overwrite one another.
    const passthrough = new URLSearchParams();
    requestUrl.searchParams.forEach((value, key) => {
      if (key !== "cache_only") {
        passthrough.set(key, value);
      }
    });
    passthrough.sort();
    const query = passthrough.toString();

    const result = await getOrFetch({
      userId: user.id,
      provider: "whoop",
      resource: query ? `${resource}?${query}` : resource,
      ttlSeconds: TTL[resource] ?? ONE_HOUR,
      cacheOnly,
      fetcher: (token) => {
        const url = new URL(`https://api.prod.whoop.com/developer/${resourcePath}`);
        passthrough.forEach((value, key) => url.searchParams.set(key, value));
        return fetchJson(url.toString(), token);
      },
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
    console.error("Error fetching WHOOP data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
