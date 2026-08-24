/**
 * Insight features derived from the cached per-ride load splits (F12 output).
 *
 * All three compute from whatever rides have been analyzed so far and carry
 * their n, so they are valid on partial data and simply sharpen as the stream
 * backfill and future syncs land. Nothing here reads streams directly — the
 * expensive parse happened once in the F12 cache.
 */
import { median, percentile } from "./baselines";
import type { Segment } from "./loadSplit";
import { ActivitySummary, sessionTypeOf } from "./features";

const DAY_MS = 86_400_000;

export interface RideWithSegments {
  stravaId: string;
  day: string;
  type: string;
  movingSeconds: number;
  descentLoad: number;
  segments: Segment[];
}

// ---------------------------------------------------------------------------
// F10 — Climb repeatability
// ---------------------------------------------------------------------------

export interface ClimbRepeatabilityResult {
  n: number; // rides with enough comparable climbs
  medianVamDecay: number | null; // % drop from first to last climb
  worstDecay: number | null;
  bestDecay: number | null;
  rides: { day: string; type: string; decayPercent: number; climbs: number }[];
}

/**
 * How much climbing speed decays from the first climb of a ride to the last.
 *
 * Speed proxy is VAM (vertical metres per hour) from the cached segments, and
 * only climbs of similar gradient are compared (|Δgrade| ≤ 3%), so a steep
 * first climb against a shallow last one does not masquerade as fatigue.
 */
export function climbRepeatability(
  rides: RideWithSegments[]
): ClimbRepeatabilityResult {
  const scored: ClimbRepeatabilityResult["rides"] = [];

  for (const ride of rides) {
    const climbs = ride.segments.filter(
      (segment) =>
        segment.kind === "climb" &&
        segment.seconds >= 180 &&
        segment.verticalMetres >= 30
    );

    if (climbs.length < 3) {
      continue;
    }

    const first = climbs[0];
    const last = climbs[climbs.length - 1];

    if (Math.abs(first.meanGrade - last.meanGrade) > 3) {
      continue; // not comparable efforts
    }

    const vam = (segment: Segment) =>
      (segment.verticalMetres / segment.seconds) * 3600;

    const firstVam = vam(first);
    const lastVam = vam(last);

    if (firstVam <= 0) {
      continue;
    }

    scored.push({
      day: ride.day,
      type: ride.type,
      decayPercent: ((firstVam - lastVam) / firstVam) * 100,
      climbs: climbs.length,
    });
  }

  const decays = scored.map((ride) => ride.decayPercent);

  return {
    n: scored.length,
    medianVamDecay: scored.length >= 5 ? median(decays) : null,
    worstDecay: scored.length >= 5 ? Math.max(...decays) : null,
    bestDecay: scored.length >= 5 ? Math.min(...decays) : null,
    rides: scored
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
// F11 — Aerobic durability (cardiac drift on climbs)
// ---------------------------------------------------------------------------

export interface DurabilityResult {
  n: number;
  medianDriftPercent: number | null; // + means the same work costs more HR late
  trend: { day: string; driftPercent: number }[];
}

/**
 * Within long rides: does the same climbing work cost more heart rate late in
 * the ride than early?
 *
 * Cost is HR per VAM on climb segments, last third of the ride versus the
 * first third. This is a durability proxy from cached segments, not full
 * HR-speed decoupling — the UI copy says so.
 */
export function aerobicDurability(rides: RideWithSegments[]): DurabilityResult {
  const scored: { day: string; driftPercent: number }[] = [];

  for (const ride of rides) {
    if (ride.movingSeconds < 3600) {
      continue; // durability is a long-ride question
    }

    const climbs = ride.segments.filter(
      (segment) =>
        segment.kind === "climb" &&
        segment.seconds >= 120 &&
        segment.verticalMetres >= 20 &&
        segment.meanHeartrate !== null &&
        segment.meanHeartrate > 60
    );

    if (climbs.length < 3) {
      continue;
    }

    const cost = (segment: Segment) => {
      const vam = (segment.verticalMetres / segment.seconds) * 3600;
      return vam > 0 ? (segment.meanHeartrate as number) / vam : NaN;
    };

    const third = Math.max(1, Math.floor(climbs.length / 3));
    const early = climbs.slice(0, third).map(cost).filter(isFinite);
    const late = climbs.slice(-third).map(cost).filter(isFinite);

    if (early.length === 0 || late.length === 0) {
      continue;
    }

    const earlyMedian = median(early);
    const lateMedian = median(late);

    if (!earlyMedian || earlyMedian <= 0) {
      continue;
    }

    scored.push({
      day: ride.day,
      driftPercent: ((lateMedian! - earlyMedian) / earlyMedian) * 100,
    });
  }

  return {
    n: scored.length,
    medianDriftPercent:
      scored.length >= 8 ? median(scored.map((r) => r.driftPercent)) : null,
    trend: scored.sort((a, b) => a.day.localeCompare(b.day)).slice(-16),
  };
}

// ---------------------------------------------------------------------------
// F13 — Connective-tissue (grip-chain) load spacing
// ---------------------------------------------------------------------------

export interface GripChainResult {
  ridesWithLoad: number;
  strengthSessions: number;
  /** Current rolling 7-day grip load as a percentile of the athlete's history. */
  current7DayPercentile: number | null;
  /** High-descent day and strength day within 48 h of each other. */
  recentStackedPairs: { descentDay: string; strengthDay: string }[];
  flaggedPairsLast90: number;
}

/**
 * Descending and pulling stress the same grip/forearm/shoulder chain, and
 * tendons remodel slower than muscle. This flags 48-hour windows that stack a
 * top-quartile descent day against a strength session.
 *
 * Thresholds are the athlete's own percentiles, never absolute numbers.
 */
export function gripChainSpacing(
  rides: RideWithSegments[],
  activities: ActivitySummary[]
): GripChainResult {
  const descentByDay = new Map<string, number>();
  for (const ride of rides) {
    if (ride.descentLoad > 0) {
      descentByDay.set(
        ride.day,
        (descentByDay.get(ride.day) ?? 0) + ride.descentLoad
      );
    }
  }

  const strengthDays = [
    ...new Set(
      activities
        .filter((activity) => sessionTypeOf(activity.type) === "strength")
        .map((activity) => activity.day)
    ),
  ].sort();

  const loads = [...descentByDay.values()];
  const highCutoff = loads.length >= 8 ? percentile(loads, 75) : Infinity;

  const highDescentDays = [...descentByDay.entries()]
    .filter(([, load]) => load >= highCutoff)
    .map(([day]) => day)
    .sort();

  // Stacked = strength within ±48 h of a high-descent day.
  const pairs: { descentDay: string; strengthDay: string }[] = [];
  for (const descentDay of highDescentDays) {
    const descentTime = Date.parse(`${descentDay}T00:00:00Z`);
    for (const strengthDay of strengthDays) {
      const gap = Math.abs(Date.parse(`${strengthDay}T00:00:00Z`) - descentTime);
      if (gap > 0 && gap <= 2 * DAY_MS) {
        pairs.push({ descentDay, strengthDay });
      }
    }
  }

  const newestDay = [...descentByDay.keys(), ...strengthDays].sort().pop();
  const cutoff90 = newestDay
    ? Date.parse(`${newestDay}T00:00:00Z`) - 90 * DAY_MS
    : 0;

  // Rolling 7-day load ending at the newest day, ranked against every other
  // 7-day window in the athlete's history.
  let currentPercentile: number | null = null;
  if (newestDay && loads.length >= 8) {
    const days = [...descentByDay.keys()].sort();
    const windowLoad = (endDay: string) => {
      const end = Date.parse(`${endDay}T00:00:00Z`);
      let total = 0;
      for (const [day, load] of descentByDay) {
        const t = Date.parse(`${day}T00:00:00Z`);
        if (t <= end && t > end - 7 * DAY_MS) {
          total += load;
        }
      }
      return total;
    };

    const history = days.map(windowLoad);
    const current = windowLoad(newestDay);
    const below = history.filter((value) => value <= current).length;
    currentPercentile = Math.round((below / history.length) * 100);
  }

  return {
    ridesWithLoad: descentByDay.size,
    strengthSessions: strengthDays.length,
    current7DayPercentile: currentPercentile,
    recentStackedPairs: pairs
      .filter((pair) => Date.parse(`${pair.descentDay}T00:00:00Z`) >= cutoff90)
      .slice(-6)
      .reverse(),
    flaggedPairsLast90: pairs.filter(
      (pair) => Date.parse(`${pair.descentDay}T00:00:00Z`) >= cutoff90
    ).length,
  };
}
