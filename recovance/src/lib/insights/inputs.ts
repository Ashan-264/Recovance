import { buildNightlyReadings } from "./baselines";
import type { NightlyReading } from "./baselines";
import type { ActivitySummary, HrvSeriesNight, StressDay } from "./features";
import { LoadSplit, RideLoadSummary } from "./loadSplit";
import {
  StoredActivityMetrics,
  computeAndStoreMetrics,
  needsCompute,
} from "./metricsStore";
import type { RunOnTrail } from "./trailFeatures";
import type { RideWithSegments } from "./streamFeatures";
import { prisma } from "../prisma";

/**
 * Loads and derives every input the insight computations need, advancing the
 * incremental per-ride metric cache as a side effect. Shared by the snapshot
 * endpoint (/api/insights) and the history endpoint, so the two can never
 * disagree about what the data is.
 */

interface ActivityRow {
  stravaId: bigint;
  startDate: Date;
  type: string;
  movingTime: number | null;
  distance: number | null;
  totalElevationGain: number | null;
}

/**
 * Computes the climb/descent load split for any activity that has streams but
 * no cached result yet, stores it, and returns every cached split.
 *
 * Incremental by design: the expensive parse happens once per activity, so the
 * insights page stays fast as the stream backfill grows.
 */
async function computeAndCacheLoadSplits(
  userId: string,
  activities: ActivityRow[],
  options: { skipCompute?: boolean } = {}
): Promise<{
  summaries: RideLoadSummary[];
  withSegments: RideWithSegments[];
  descentRuns: RunOnTrail[];
  pendingSplits: number;
}> {
  const streams = await prisma.stravaStream.findMany({
    where: { userId },
    select: { stravaId: true },
  });

  if (streams.length === 0) {
    return { summaries: [], withSegments: [], descentRuns: [], pendingSplits: 0 };
  }

  const cached = await prisma.activityMetric.findMany({
    where: { userId },
    select: { stravaId: true, metrics: true, type: true, startDate: true },
  });
  const cachedMetrics = new Map(
    cached.map((row) => [
      row.stravaId.toString(),
      row.metrics as StoredActivityMetrics,
    ])
  );

  const pending = streams
    .map((row) => row.stravaId)
    .filter((id) => needsCompute(cachedMetrics.get(id.toString())));

  const activityById = new Map(
    activities.map((activity) => [activity.stravaId.toString(), activity])
  );

  // Bounded per request so a cold cache cannot stall the page; later requests
  // pick up where this one stopped. As-of requests read cache only.
  for (const stravaId of options.skipCompute ? [] : pending.slice(0, 120)) {
    const activity = activityById.get(stravaId.toString());
    if (!activity) {
      continue;
    }
    await computeAndStoreMetrics(prisma, userId, stravaId, activity);
  }

  const all = await prisma.activityMetric.findMany({
    where: { userId },
    select: { stravaId: true, startDate: true, type: true, metrics: true },
  });

  const descentRuns: RunOnTrail[] = all.flatMap((row) => {
    const metrics = row.metrics as StoredActivityMetrics;
    if (metrics.unavailable || !Array.isArray(metrics.descentRuns)) {
      return [];
    }
    const day = row.startDate.toISOString().slice(0, 10);
    return metrics.descentRuns.map((run) => ({
      ...run,
      day,
      rideType: row.type,
    }));
  });

  const withSegments: RideWithSegments[] = all.flatMap((row) => {
    const metrics = row.metrics as Partial<LoadSplit> & { unavailable?: boolean };
    if (metrics.unavailable || !Array.isArray(metrics.segments)) {
      return [];
    }
    const activity = activityById.get(row.stravaId.toString());
    return [
      {
        stravaId: row.stravaId.toString(),
        day: row.startDate.toISOString().slice(0, 10),
        type: row.type,
        movingSeconds: activity?.movingTime ?? 0,
        descentLoad: metrics.descentLoad ?? 0,
        segments: metrics.segments,
      },
    ];
  });

  const summaries = all.flatMap((row) => {
    const metrics = row.metrics as Partial<LoadSplit> & { unavailable?: boolean };
    if (metrics.unavailable || typeof metrics.descentShare !== "number") {
      return [];
    }

    const activity = activityById.get(row.stravaId.toString());

    return [
      {
        stravaId: row.stravaId.toString(),
        name: activity ? `${row.type}` : row.type,
        day: row.startDate.toISOString().slice(0, 10),
        type: row.type,
        descentShare: metrics.descentShare,
        descentMinutes: Math.round((metrics.descentSeconds ?? 0) / 60),
        climbMinutes: Math.round((metrics.climbSeconds ?? 0) / 60),
        verticalDescent: Math.round(metrics.verticalDescent ?? 0),
      },
    ];
  });

  return {
    summaries,
    withSegments,
    descentRuns,
    pendingSplits: Math.max(0, pending.length - 120),
  };
}


export interface InsightInputs {
  activities: ActivitySummary[];
  readings: NightlyReading[];
  /** Full, untruncated nightly readings — for "last day this works" hints. */
  allReadings: NightlyReading[];
  hrvNights: HrvSeriesNight[];
  stressDays: StressDay[];
  trainingDays: Set<string>;
  summaries: RideLoadSummary[];
  withSegments: RideWithSegments[];
  descentRuns: RunOnTrail[];
  pendingSplits: number;
  streams: number;
}

export async function loadInsightInputs(
  userId: string,
  options: { asOf?: string } = {}
): Promise<InsightInputs> {
  const { asOf } = options;
  const [activityRows, dailyRows, sleepRows] = await Promise.all([
    prisma.stravaActivity.findMany({
      where: { userId },
      select: {
        stravaId: true,
        startDate: true,
        type: true,
        movingTime: true,
        distance: true,
        totalElevationGain: true,
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.ouraDailyRecord.findMany({
      where: { userId },
      select: { dataset: true, day: true, payload: true },
    }),
    prisma.ouraSleepPeriod.findMany({
      where: { userId },
      select: { day: true, payload: true },
    }),
  ]);

  const upTo = (day: string) => !asOf || day <= asOf;

  const filteredRows = asOf
    ? activityRows.filter(
        (row) => row.startDate.toISOString().slice(0, 10) <= asOf
      )
    : activityRows;

  const activities: ActivitySummary[] = filteredRows.map((row) => ({
    stravaId: row.stravaId.toString(),
    startDate: row.startDate,
    day: row.startDate.toISOString().slice(0, 10),
    type: row.type,
    movingSeconds: row.movingTime ?? 0,
    distanceMeters: row.distance ?? 0,
    elevationGain: row.totalElevationGain ?? 0,
  }));

  const payloadsFor = (dataset: string) =>
    dailyRows
      .filter((row) => row.dataset === dataset)
      .map((row) => row.payload as Record<string, unknown>);

  const allReadings = buildNightlyReadings({
    sleepPeriods: sleepRows.map((row) => row.payload as Record<string, unknown>),
    readiness: payloadsFor("daily_readiness"),
    dailySleep: payloadsFor("daily_sleep"),
  });
  const readings = allReadings.filter((reading) => upTo(reading.day));

  const trainingDays = new Set(activities.map((activity) => activity.day));

  // Recovery latency needs each day's MAIN sleep — never a nap.
  const mainSleepByDay = new Map<
    string,
    { day: string; items: (number | null)[]; intervalSeconds: number; isMain: boolean }
  >();
  for (const row of sleepRows) {
    const payload = row.payload as {
      day?: string;
      type?: string;
      hrv?: { items?: (number | null)[]; interval?: number } | null;
    };
    const items = payload.hrv?.items;
    if (!payload.day || !items || items.length < 12) {
      continue;
    }
    const candidate = {
      day: payload.day,
      items,
      intervalSeconds: payload.hrv?.interval ?? 300,
      isMain: payload.type === "long_sleep",
    };
    const existing = mainSleepByDay.get(payload.day);
    if (
      !existing ||
      (candidate.isMain && !existing.isMain) ||
      (candidate.isMain === existing.isMain &&
        candidate.items.length > existing.items.length)
    ) {
      mainSleepByDay.set(payload.day, candidate);
    }
  }
  const hrvNights: HrvSeriesNight[] = [...mainSleepByDay.values()]
    .filter(({ day }) => upTo(day))
    .map(({ day, items, intervalSeconds }) => ({ day, items, intervalSeconds }));

  const stressDays: StressDay[] = payloadsFor("daily_stress")
    .map((payload) => ({
      day: (payload.day as string) ?? "",
      stressHighSeconds: (payload.stress_high as number) ?? null,
      recoveryHighSeconds: (payload.recovery_high as number) ?? null,
    }))
    .filter((day) => upTo(day.day));

  const computed = await computeAndCacheLoadSplits(
    userId,
    filteredRows,
    { skipCompute: Boolean(asOf) }
  );
  const summaries = computed.summaries.filter((s) => upTo(s.day));
  const withSegments = computed.withSegments.filter((r) => upTo(r.day));
  const descentRuns = computed.descentRuns.filter((r) => upTo(r.day));
  const pendingSplits = computed.pendingSplits;

  const streams = await prisma.stravaStream.count({ where: { userId } });

  return {
    activities,
    readings,
    allReadings,
    hrvNights,
    stressDays,
    trainingDays,
    summaries,
    withSegments,
    descentRuns,
    pendingSplits,
    streams,
  };
}


/**
 * Derives an as-of view from already-loaded full inputs, in memory. With the
 * inputs cache this makes every historical date essentially free — one heavy
 * load serves them all.
 */
export function truncateInputs(full: InsightInputs, asOf: string): InsightInputs {
  const upTo = (day: string) => day <= asOf;
  const activities = full.activities.filter((activity) => upTo(activity.day));

  return {
    activities,
    readings: full.readings.filter((reading) => upTo(reading.day)),
    allReadings: full.allReadings,
    hrvNights: full.hrvNights.filter((night) => upTo(night.day)),
    stressDays: full.stressDays.filter((day) => upTo(day.day)),
    trainingDays: new Set(activities.map((activity) => activity.day)),
    summaries: full.summaries.filter((summary) => upTo(summary.day)),
    withSegments: full.withSegments.filter((ride) => upTo(ride.day)),
    descentRuns: full.descentRuns.filter((run) => upTo(run.day)),
    pendingSplits: full.pendingSplits,
    streams: full.streams,
  };
}
