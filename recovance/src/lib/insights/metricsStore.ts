import type { PrismaClient } from "@/generated/prisma";
import {
  DescentRun,
  LoadSplit,
  computeDescentRuns,
  computeLoadSplit,
  streamsFromPayload,
} from "./loadSplit";

/**
 * Single write path for per-activity derived metrics.
 *
 * The expensive part of every streams feature is parsing megabytes of stream
 * JSON; it happens exactly once per activity here, and everything downstream
 * (F7–F13, F15) reads the small cached rows in `activity_metrics`.
 */

export interface StoredActivityMetrics extends Partial<LoadSplit> {
  unavailable?: boolean;
  descentRuns?: DescentRun[];
  /** Bumped when the derived shape changes; old rows recompute lazily. */
  metricsVersion?: number;
}

/** Bump to force lazy recomputation after a change to the derived shape. */
export const METRICS_VERSION = 2;

export async function computeAndStoreMetrics(
  prisma: PrismaClient,
  userId: string,
  stravaId: bigint,
  activity: { startDate: Date; type: string }
): Promise<StoredActivityMetrics | null> {
  const stream = await prisma.stravaStream.findUnique({
    where: { userId_stravaId: { userId, stravaId } },
    select: { payload: true },
  });

  if (!stream) {
    return null;
  }

  const parsed = streamsFromPayload(stream.payload);
  const split = computeLoadSplit(parsed);

  const metrics: StoredActivityMetrics = split
    ? {
        ...split,
        descentRuns: computeDescentRuns(parsed, split),
        metricsVersion: METRICS_VERSION,
      }
    : { unavailable: true, metricsVersion: METRICS_VERSION };

  await prisma.activityMetric.upsert({
    where: { userId_stravaId: { userId, stravaId } },
    create: {
      userId,
      stravaId,
      startDate: activity.startDate,
      type: activity.type,
      streamsAvailable: true,
      hasHeartrate: split?.usedHeartrate ?? false,
      metrics: metrics as object,
    },
    update: {
      metrics: metrics as object,
      streamsAvailable: true,
      hasHeartrate: split?.usedHeartrate ?? false,
      computedAt: new Date(),
    },
  });

  return metrics;
}

/** Rows needing (re)computation: missing entirely, or from an older version. */
export function needsCompute(
  metrics: StoredActivityMetrics | undefined
): boolean {
  return !metrics || (metrics.metricsVersion ?? 1) < METRICS_VERSION;
}
