/**
 * Recomputes derived metrics for every activity with streams.
 *
 *   npx tsx scripts/insights/recompute-metrics.ts
 *
 * Used after a metrics-shape change (METRICS_VERSION bump); the web path also
 * recomputes lazily in bounded batches, this just does it all at once.
 */
import {
  METRICS_VERSION,
  StoredActivityMetrics,
  computeAndStoreMetrics,
  needsCompute,
} from "../../src/lib/insights/metricsStore";
import { createClient, resolveUserId } from "./_client";

async function main() {
  const prisma = createClient();

  try {
    const userId = await resolveUserId(prisma);

    const streams = await prisma.stravaStream.findMany({
      where: { userId },
      select: { stravaId: true },
    });
    const activities = await prisma.stravaActivity.findMany({
      where: { userId },
      select: { stravaId: true, startDate: true, type: true },
    });
    const existing = await prisma.activityMetric.findMany({
      where: { userId },
      select: { stravaId: true, metrics: true },
    });

    const activityById = new Map(
      activities.map((activity) => [activity.stravaId.toString(), activity])
    );
    const metricsById = new Map(
      existing.map((row) => [
        row.stravaId.toString(),
        row.metrics as StoredActivityMetrics,
      ])
    );

    const pending = streams.filter((row) =>
      needsCompute(metricsById.get(row.stravaId.toString()))
    );

    console.log(
      `${streams.length} activities with streams; ${pending.length} need version ${METRICS_VERSION}.`
    );

    let done = 0;
    let withRuns = 0;
    let totalRuns = 0;

    for (const row of pending) {
      const activity = activityById.get(row.stravaId.toString());
      if (!activity) continue;

      const metrics = await computeAndStoreMetrics(
        prisma,
        userId,
        row.stravaId,
        activity
      );

      const runs = metrics?.descentRuns?.length ?? 0;
      if (runs > 0) {
        withRuns++;
        totalRuns += runs;
      }

      if (++done % 50 === 0) {
        console.log(`  ${done}/${pending.length}`);
      }
    }

    console.log(
      `Done: ${done} recomputed — ${withRuns} rides contain ${totalRuns} scored descent runs.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
