import { prisma } from "../prisma";
import { InsightInputs, loadInsightInputs } from "./inputs";

/**
 * Server-side memoization for the insights pipeline.
 *
 * Loading and parsing ~2 MB of stored JSON per request was the entire cost of
 * /api/insights (~2.5 s). The data only changes when a sync or recompute
 * writes rows, so requests are served from memory and invalidated by a
 * fingerprint of cheap aggregate queries — never by guessing with a TTL.
 */

interface CacheBox {
  fingerprint: string;
  inputs: InsightInputs | null;
  inputsPromise: Promise<InsightInputs> | null;
  responses: Map<string, unknown>;
}

// Survives dev hot-reloads the same way the Prisma client does.
const globalStash = globalThis as unknown as {
  __insightsCache?: Map<string, CacheBox>;
};
const cache = (globalStash.__insightsCache ??= new Map<string, CacheBox>());

const MAX_RESPONSES = 64;

/** Cheap change detector: row counts + latest write time per source table. */
export async function dataFingerprint(userId: string): Promise<string> {
  const [activities, daily, periods, metrics, streams] = await Promise.all([
    prisma.stravaActivity.aggregate({
      where: { userId },
      _count: true,
      _max: { fetchedAt: true },
    }),
    prisma.ouraDailyRecord.aggregate({
      where: { userId },
      _count: true,
      _max: { fetchedAt: true },
    }),
    prisma.ouraSleepPeriod.aggregate({
      where: { userId },
      _count: true,
      _max: { fetchedAt: true },
    }),
    prisma.activityMetric.aggregate({
      where: { userId },
      _count: true,
      _max: { computedAt: true },
    }),
    prisma.stravaStream.aggregate({
      where: { userId },
      _count: true,
      _max: { fetchedAt: true },
    }),
  ]);

  const stamp = (aggregate: { _count: number; _max: Record<string, Date | null> }) => {
    const max = Object.values(aggregate._max)[0];
    return `${aggregate._count}:${max ? max.getTime() : 0}`;
  };

  return [
    stamp(activities),
    stamp(daily),
    stamp(periods),
    stamp(metrics),
    stamp(streams),
  ].join("|");
}

function boxFor(userId: string, fingerprint: string): CacheBox {
  const existing = cache.get(userId);
  if (existing && existing.fingerprint === fingerprint) {
    return existing;
  }
  const fresh: CacheBox = {
    fingerprint,
    inputs: null,
    inputsPromise: null,
    responses: new Map(),
  };
  cache.set(userId, fresh);
  return fresh;
}

/**
 * The full (untruncated) inputs, loaded at most once per data version.
 * Concurrent requests during a cold load share one promise instead of racing.
 */
export async function getCachedInputs(userId: string): Promise<{
  inputs: InsightInputs;
  fingerprint: string;
}> {
  const fingerprint = await dataFingerprint(userId);
  const box = boxFor(userId, fingerprint);

  if (box.inputs) {
    return { inputs: box.inputs, fingerprint };
  }

  if (!box.inputsPromise) {
    box.inputsPromise = loadInsightInputs(userId).then((inputs) => {
      box.inputs = inputs;
      box.inputsPromise = null;
      return inputs;
    });
  }

  return { inputs: await box.inputsPromise, fingerprint };
}

/** Memoizes a derived response under the current fingerprint. */
export async function memoResponse<T>(
  userId: string,
  fingerprint: string,
  key: string,
  produce: () => T | Promise<T>
): Promise<T> {
  const box = boxFor(userId, fingerprint);

  if (box.responses.has(key)) {
    return box.responses.get(key) as T;
  }

  const value = await produce();

  if (box.responses.size >= MAX_RESPONSES) {
    const oldest = box.responses.keys().next().value;
    if (oldest !== undefined) box.responses.delete(oldest);
  }
  box.responses.set(key, value);

  return value;
}
