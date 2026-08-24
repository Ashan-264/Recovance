/**
 * Compute functions for the insight features that have passed Gate A.
 *
 * All pure: they take already-loaded rows and return results plus the `n` they
 * were computed from. Nothing here fetches, and nothing invents a value for a
 * sample too small to support one — an under-powered bucket returns
 * `insufficient: true` instead of a number.
 */
import {
  Baseline,
  NightlyReading,
  deviation,
  median,
  percentile,
  rollingBaseline,
} from "./baselines";

/** Minimum observations before a per-bucket figure is reported at all. */
export const MIN_BUCKET_N = 8;

export type SessionType = "mtb" | "road" | "strength" | "other";

export interface ActivitySummary {
  stravaId: string;
  startDate: Date;
  day: string; // YYYY-MM-DD, local calendar day of the activity
  type: string;
  movingSeconds: number;
  distanceMeters: number;
  elevationGain: number;
}

export function sessionTypeOf(type: string): SessionType {
  const value = type.toLowerCase();
  if (value.includes("mountainbike") || value.includes("gravel")) return "mtb";
  if (value.includes("ride") || value.includes("cycl")) return "road";
  if (
    value.includes("weight") ||
    value.includes("workout") ||
    value.includes("crossfit") ||
    value.includes("strength")
  ) {
    return "strength";
  }
  return "other";
}

export const SESSION_LABELS: Record<SessionType, string> = {
  mtb: "Mountain bike",
  road: "Road / other ride",
  strength: "Strength",
  other: "Other",
};

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// F1 — Per-activity-type recovery cost
// ---------------------------------------------------------------------------

export interface RecoveryCostBucket {
  sessionType: SessionType;
  label: string;
  n: number;
  insufficient: boolean;
  hrvDelta: number | null; // ms vs the 30-day baseline
  hrvDeltaMad: number | null; // in MAD units — comparable across metrics
  restingHrDelta: number | null; // bpm
  deepSleepDelta: number | null; // hours
}

export interface RecoveryCostResult {
  buckets: RecoveryCostBucket[];
  totalPairs: number;
  /** True when no bucket separates from the others — the split adds nothing. */
  bucketsSeparate: boolean | null;
}

/**
 * What a session costs the following night, versus the athlete's own baseline.
 *
 * The comparison is against a rolling baseline that excludes the night being
 * measured, so a heavy night cannot drag down the reference it is judged by.
 * Nights following more than one activity are attributed to the longest
 * session — a 20-minute spin before a 3-hour ride is not the cause.
 */
export function recoveryCost(
  activities: ActivitySummary[],
  readings: NightlyReading[]
): RecoveryCostResult {
  const readingByDay = new Map(readings.map((reading) => [reading.day, reading]));

  // One activity per day: the longest, so the night is attributed to the
  // session that plausibly caused the change.
  const dominantByDay = new Map<string, ActivitySummary>();
  for (const activity of activities) {
    const existing = dominantByDay.get(activity.day);
    if (!existing || activity.movingSeconds > existing.movingSeconds) {
      dominantByDay.set(activity.day, activity);
    }
  }

  const samples = new Map<
    SessionType,
    { hrv: number[]; hrvMad: number[]; rhr: number[]; deep: number[] }
  >();

  let totalPairs = 0;

  for (const [day, activity] of dominantByDay) {
    const nightDay = addDays(day, 1);
    const night = readingByDay.get(nightDay);

    if (!night) {
      continue;
    }

    const bucket = sessionTypeOf(activity.type);
    const entry =
      samples.get(bucket) ?? { hrv: [], hrvMad: [], rhr: [], deep: [] };

    const hrvBase = rollingBaseline(readings, nightDay, "hrv");
    const rhrBase = rollingBaseline(readings, nightDay, "restingHr");
    const deepBase = rollingBaseline(readings, nightDay, "deepHours");

    let counted = false;

    if (night.hrv !== null && hrvBase) {
      entry.hrv.push(night.hrv - hrvBase.median);
      const dev = deviation(night.hrv, hrvBase);
      if (dev !== null && isFinite(dev)) {
        entry.hrvMad.push(dev);
      }
      counted = true;
    }
    if (night.restingHr !== null && rhrBase) {
      entry.rhr.push(night.restingHr - rhrBase.median);
      counted = true;
    }
    if (night.deepHours !== null && deepBase) {
      entry.deep.push(night.deepHours - deepBase.median);
      counted = true;
    }

    if (counted) {
      samples.set(bucket, entry);
      totalPairs++;
    }
  }

  const buckets: RecoveryCostBucket[] = (
    ["mtb", "road", "strength", "other"] as SessionType[]
  ).map((sessionType) => {
    const entry = samples.get(sessionType);
    const n = entry?.hrv.length ?? 0;
    const insufficient = n < MIN_BUCKET_N;

    return {
      sessionType,
      label: SESSION_LABELS[sessionType],
      n,
      insufficient,
      hrvDelta: insufficient || !entry ? null : median(entry.hrv),
      hrvDeltaMad:
        insufficient || !entry || entry.hrvMad.length === 0
          ? null
          : median(entry.hrvMad),
      restingHrDelta:
        insufficient || !entry || entry.rhr.length === 0 ? null : median(entry.rhr),
      deepSleepDelta:
        insufficient || !entry || entry.deep.length === 0
          ? null
          : median(entry.deep),
    };
  });

  // Do the reported buckets actually differ? If the spread between them is
  // smaller than the within-bucket noise, the whole split is decorative.
  const reported = buckets.filter((bucket) => bucket.hrvDeltaMad !== null);
  let bucketsSeparate: boolean | null = null;

  if (reported.length >= 2) {
    const values = reported.map((bucket) => bucket.hrvDeltaMad!);
    bucketsSeparate = Math.max(...values) - Math.min(...values) >= 0.5;
  }

  return { buckets, totalPairs, bucketsSeparate };
}

// ---------------------------------------------------------------------------
// F4 — Recovery latency
// ---------------------------------------------------------------------------

export interface HrvSeriesNight {
  day: string;
  /** 5-minute HRV samples in order; nulls are gaps Oura could not measure. */
  items: (number | null)[];
  intervalSeconds: number;
}

export interface RecoveryLatencyResult {
  n: number;
  afterTraining: { n: number; medianHours: number | null };
  afterRest: { n: number; medianHours: number | null };
  /** Positive means recovery took longer after training. */
  differenceHours: number | null;
}

/**
 * How long into the night HRV takes to reach the athlete's own baseline.
 *
 * A morning average hides the shape of a night: two nights can average the same
 * while one spent four hours below baseline. Latency is that shape, reduced to
 * one number — and Oura does not report it.
 */
export function recoveryLatency(
  nights: HrvSeriesNight[],
  readings: NightlyReading[],
  trainingDays: Set<string>
): RecoveryLatencyResult {
  const afterTraining: number[] = [];
  const afterRest: number[] = [];

  for (const night of nights) {
    const baseline = rollingBaseline(readings, night.day, "hrv");
    if (!baseline) {
      continue;
    }

    const samples = night.items;
    const target = baseline.median;

    // First sustained crossing: two consecutive samples at or above baseline,
    // so a single spike does not count as recovered.
    let crossingIndex = -1;
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      if (a !== null && b !== null && a >= target && b >= target) {
        crossingIndex = i;
        break;
      }
    }

    if (crossingIndex === -1) {
      continue; // never reached baseline; excluded rather than counted as zero
    }

    const hours = (crossingIndex * night.intervalSeconds) / 3600;

    // The night after a training day is attributed to that day.
    const previousDay = addDays(night.day, -1);
    if (trainingDays.has(previousDay)) {
      afterTraining.push(hours);
    } else {
      afterRest.push(hours);
    }
  }

  const trainingMedian =
    afterTraining.length >= MIN_BUCKET_N ? median(afterTraining) : null;
  const restMedian = afterRest.length >= MIN_BUCKET_N ? median(afterRest) : null;

  return {
    n: afterTraining.length + afterRest.length,
    afterTraining: { n: afterTraining.length, medianHours: trainingMedian },
    afterRest: { n: afterRest.length, medianHours: restMedian },
    differenceHours:
      trainingMedian !== null && restMedian !== null
        ? trainingMedian - restMedian
        : null,
  };
}

// ---------------------------------------------------------------------------
// F6 — Rest-day audit
// ---------------------------------------------------------------------------

export interface RestDayAuditResult {
  restDays: number;
  scored: number;
  medianStressHigh: number | null; // hours in "high stress" on a rest day
  restfulDays: number;
  stressfulDays: number;
  /** Next-night HRV vs baseline, split by how restful the rest day was. */
  nextNightHrvAfterRestful: number | null;
  nextNightHrvAfterStressful: number | null;
  n: { restful: number; stressful: number };
}

export interface StressDay {
  day: string;
  stressHighSeconds: number | null;
  recoveryHighSeconds: number | null;
}

/**
 * Were the rest days actually restful?
 *
 * A day with no workout is not automatically recovery. Splitting rest days at
 * the athlete's own median stress load and comparing the following night tests
 * whether that distinction shows up in the data at all.
 */
export function restDayAudit(
  stressDays: StressDay[],
  trainingDays: Set<string>,
  readings: NightlyReading[]
): RestDayAuditResult {
  const readingByDay = new Map(readings.map((reading) => [reading.day, reading]));

  const rest = stressDays.filter(
    (entry) => !trainingDays.has(entry.day) && entry.stressHighSeconds !== null
  );

  if (rest.length === 0) {
    return {
      restDays: 0,
      scored: 0,
      medianStressHigh: null,
      restfulDays: 0,
      stressfulDays: 0,
      nextNightHrvAfterRestful: null,
      nextNightHrvAfterStressful: null,
      n: { restful: 0, stressful: 0 },
    };
  }

  const values = rest.map((entry) => entry.stressHighSeconds as number);
  // The split is the athlete's own median, not an absolute threshold — stress
  // load is not comparable between people.
  const cutoff = percentile(values, 50);

  const restfulDeltas: number[] = [];
  const stressfulDeltas: number[] = [];

  for (const entry of rest) {
    const nextDay = addDays(entry.day, 1);
    const night = readingByDay.get(nextDay);
    const baseline: Baseline | null = rollingBaseline(readings, nextDay, "hrv");

    if (!night || night.hrv === null || !baseline) {
      continue;
    }

    const delta = night.hrv - baseline.median;
    if ((entry.stressHighSeconds as number) <= cutoff) {
      restfulDeltas.push(delta);
    } else {
      stressfulDeltas.push(delta);
    }
  }

  return {
    restDays: rest.length,
    scored: restfulDeltas.length + stressfulDeltas.length,
    medianStressHigh: median(values) / 3600,
    restfulDays: rest.filter((e) => (e.stressHighSeconds as number) <= cutoff).length,
    stressfulDays: rest.filter((e) => (e.stressHighSeconds as number) > cutoff).length,
    nextNightHrvAfterRestful:
      restfulDeltas.length >= MIN_BUCKET_N ? median(restfulDeltas) : null,
    nextNightHrvAfterStressful:
      stressfulDeltas.length >= MIN_BUCKET_N ? median(stressfulDeltas) : null,
    n: { restful: restfulDeltas.length, stressful: stressfulDeltas.length },
  };
}

// ---------------------------------------------------------------------------
// F14 — Discipline drift
// ---------------------------------------------------------------------------

export interface DriftWindow {
  weekStart: string;
  strengthMinutes: number;
  rideMinutes: number;
  ratio: number | null; // strength / ride
}

export interface DisciplineDriftResult {
  windows: DriftWindow[];
  currentRatio: number | null;
  medianRatio: number | null;
  /** Weeks since the last strength session; the drift this is meant to catch. */
  weeksSinceStrength: number | null;
  drifting: boolean;
}

/**
 * Rolling 4-week strength-to-ride balance.
 *
 * The failure mode is silent: a weekend rider who lifts on weekdays can lose
 * one discipline for a month without noticing. This surfaces the ratio and how
 * long since the last strength session.
 */
export function disciplineDrift(
  activities: ActivitySummary[],
  weeks = 26
): DisciplineDriftResult {
  if (activities.length === 0) {
    return {
      windows: [],
      currentRatio: null,
      medianRatio: null,
      weeksSinceStrength: null,
      drifting: false,
    };
  }

  const sorted = [...activities].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  const end = sorted[sorted.length - 1].startDate;

  const windows: DriftWindow[] = [];

  for (let index = weeks - 1; index >= 0; index--) {
    const windowEnd = new Date(end.getTime() - index * 7 * 86_400_000);
    const windowStart = new Date(windowEnd.getTime() - 28 * 86_400_000);

    const inWindow = sorted.filter(
      (activity) =>
        activity.startDate > windowStart && activity.startDate <= windowEnd
    );

    const strengthMinutes = inWindow
      .filter((activity) => sessionTypeOf(activity.type) === "strength")
      .reduce((total, activity) => total + activity.movingSeconds / 60, 0);

    const rideMinutes = inWindow
      .filter((activity) => {
        const bucket = sessionTypeOf(activity.type);
        return bucket === "mtb" || bucket === "road";
      })
      .reduce((total, activity) => total + activity.movingSeconds / 60, 0);

    windows.push({
      weekStart: windowStart.toISOString().slice(0, 10),
      strengthMinutes: Math.round(strengthMinutes),
      rideMinutes: Math.round(rideMinutes),
      ratio: rideMinutes > 0 ? strengthMinutes / rideMinutes : null,
    });
  }

  const ratios = windows
    .map((window) => window.ratio)
    .filter((ratio): ratio is number => ratio !== null);

  const lastStrength = [...sorted]
    .reverse()
    .find((activity) => sessionTypeOf(activity.type) === "strength");

  const weeksSinceStrength = lastStrength
    ? (end.getTime() - lastStrength.startDate.getTime()) / (7 * 86_400_000)
    : null;

  const currentRatio = windows[windows.length - 1]?.ratio ?? null;
  const medianRatio = ratios.length > 0 ? median(ratios) : null;

  return {
    windows,
    currentRatio,
    medianRatio,
    weeksSinceStrength:
      weeksSinceStrength === null ? null : Math.round(weeksSinceStrength * 10) / 10,
    // Drifting when the current balance is less than half the usual, or no
    // strength work in three weeks.
    drifting:
      (currentRatio !== null &&
        medianRatio !== null &&
        medianRatio > 0 &&
        currentRatio < medianRatio * 0.5) ||
      (weeksSinceStrength !== null && weeksSinceStrength >= 3),
  };
}
