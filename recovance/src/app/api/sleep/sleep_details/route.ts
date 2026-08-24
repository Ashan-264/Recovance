import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchJson,
  getOrFetch,
  NEVER_EXPIRES,
  ProviderRequestError,
} from "@/lib/providerCache";
import { getCurrentUser } from "@/lib/session";

interface OuraSleepDocument {
  id?: string;
  [key: string]: unknown;
}

/**
 * A single Oura sleep session by id.
 *
 * Checks the sleep periods already stored by the range cache first — most
 * lookups are for a session that was pulled in by a date-range fetch — and only
 * calls Oura for ids that were never cached. Completed sessions are immutable,
 * so the entry never expires.
 */
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const user = await getCurrentUser(req);

    const stored = await prisma.ouraSleepPeriod.findUnique({
      where: { userId_ouraId: { userId: user.id, ouraId: session_id } },
      select: { payload: true },
    });

    if (stored) {
      return NextResponse.json({
        ...(stored.payload as object),
        cache: { hit: true, source: "sleep_periods" },
      });
    }

    const result = await getOrFetch<OuraSleepDocument>({
      userId: user.id,
      provider: "oura",
      resource: `sleep_session:${session_id}`,
      ttlSeconds: NEVER_EXPIRES,
      fetcher: (token) =>
        fetchJson(
          `https://api.ouraring.com/v2/usercollection/sleep/${session_id}`,
          token
        ),
    });

    if (!result) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...(result.data as object),
      cache: { hit: result.fromCache, stale: result.stale ?? false },
    });
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching sleep session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
