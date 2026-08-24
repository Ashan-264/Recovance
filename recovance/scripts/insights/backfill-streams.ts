/**
 * P0-2 — Fetch per-activity Strava streams into `strava_streams`.
 *
 *   npx tsx scripts/insights/backfill-streams.ts [--token XXX] [--limit 50] [--type MountainBikeRide]
 *
 * Streams are the scarcest resource in this app: one request per activity
 * against a 200-per-15-minutes budget. So this script is
 *   - resumable: activities already stored are skipped, re-run to continue;
 *   - budgeted: paces itself under the limit instead of reacting to 429s;
 *   - durable: each activity is written as it arrives, never batched at the end.
 *
 * Token resolution: --token, then STRAVA_ACCESS_TOKEN, then the stored OAuth
 * account (which also auto-refreshes).
 */
import { RequestBudget } from "../../src/lib/insights/rateLimit";
import { getProviderToken } from "../../src/lib/providerAccounts";
import { arg, createClient, hasFlag, resolveUserId } from "./_client";

const STREAM_KEYS = [
  "time",
  "distance",
  "velocity_smooth",
  "altitude",
  "grade_smooth",
  "heartrate",
  "moving",
  "latlng",
].join(",");

interface StreamSet {
  [key: string]: { data?: unknown[]; original_size?: number } | undefined;
}

async function resolveToken(userId: string): Promise<string> {
  const explicit = arg("--token") || process.env.STRAVA_ACCESS_TOKEN;
  if (explicit) {
    return explicit;
  }

  const stored = await getProviderToken(userId, "strava");
  if (stored) {
    return stored.accessToken;
  }

  throw new Error(
    "No Strava token. Reconnect at /connect (stores a refreshable token), or pass --token."
  );
}

async function main() {
  const prisma = createClient();

  try {
    const userId = await resolveUserId(prisma);
    const token = await resolveToken(userId);
    const typeFilter = arg("--type");
    const limit = arg("--limit") ? parseInt(arg("--limit")!, 10) : undefined;

    const already = await prisma.stravaStream.findMany({
      where: { userId },
      select: { stravaId: true },
    });
    const have = new Set(already.map((row) => row.stravaId.toString()));

    const candidates = await prisma.stravaActivity.findMany({
      where: { userId, ...(typeFilter ? { type: typeFilter } : {}) },
      orderBy: { startDate: "desc" },
      select: { stravaId: true, type: true, startDate: true, name: true },
    });

    const todo = candidates
      .filter((activity) => !have.has(activity.stravaId.toString()))
      .slice(0, limit);

    console.log(
      `${candidates.length} activities, ${have.size} already have streams, ${todo.length} to fetch.`
    );

    if (hasFlag("--dry-run") || todo.length === 0) {
      return;
    }

    const budget = new RequestBudget({
      onWait: (seconds) =>
        console.log(`  … rate-limit window full, pausing ${seconds}s`),
    });

    let stored = 0;
    let empty = 0;
    let failed = 0;

    for (const [index, activity] of todo.entries()) {
      await budget.take();

      const url = `https://www.strava.com/api/v3/activities/${activity.stravaId}/streams?keys=${STREAM_KEYS}&key_by_type=true`;

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 429) {
          console.error("Strava returned 429 despite pacing — stopping. Re-run later to resume.");
          break;
        }

        if (!response.ok) {
          // 404 means the activity has no streams (manual entry, no device).
          if (response.status === 404) {
            empty++;
          } else {
            failed++;
            console.error(`  ${activity.stravaId}: HTTP ${response.status}`);
          }
          continue;
        }

        const streams = (await response.json()) as StreamSet;
        const pointCount = streams.time?.data?.length ?? 0;

        if (pointCount === 0) {
          empty++;
          continue;
        }

        await prisma.stravaStream.upsert({
          where: { userId_stravaId: { userId, stravaId: activity.stravaId } },
          create: {
            userId,
            stravaId: activity.stravaId,
            payload: streams as object,
            pointCount,
          },
          update: { payload: streams as object, pointCount, fetchedAt: new Date() },
        });

        stored++;
      } catch (error) {
        failed++;
        console.error(`  ${activity.stravaId}: ${(error as Error).message}`);
      }

      if ((index + 1) % 25 === 0) {
        console.log(
          `  ${index + 1}/${todo.length} — stored ${stored}, empty ${empty}, failed ${failed} (window ${budget.used.window}, day ${budget.used.day})`
        );
      }
    }

    const total = await prisma.stravaStream.count({ where: { userId } });
    console.log(
      `\nDone. Stored ${stored} this run (${empty} had no streams, ${failed} failed). ${total} activities now have streams.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
