/**
 * P0-3 — Nightly series and rolling baselines.
 *
 * Every "vs baseline" comparison in the insights features depends on this, so
 * two rules are enforced here rather than in each feature:
 *
 *  1. **No interpolation.** A night without a ring reading stays absent. Filling
 *     gaps would manufacture recovery data on exactly the days the athlete was
 *     least consistent, which is where the signal is supposed to live.
 *  2. **The baseline excludes the day it describes.** Otherwise a big HRV drop
 *     drags its own baseline down and understates itself.
 *
 * Median + MAD (not mean + SD) because a single 30 ms HRV night or a travel
 * night should not move the reference.
 */

export interface NightlyReading {
  day: string; // YYYY-MM-DD
  hrv: number | null; // ms, average over the night
  restingHr: number | null; // bpm, lowest during sleep
  sleepHours: number | null;
  deepHours: number | null;
  remHours: number | null;
  efficiency: number | null;
  tempDeviation: number | null; // °C vs the ring's own baseline
  readinessScore: number | null;
  sleepScore: number | null;
}

export type BaselineMetric =
  | "hrv"
  | "restingHr"
  | "sleepHours"
  | "deepHours"
  | "tempDeviation";

export interface Baseline {
  median: number;
  mad: number; // median absolute deviation
  n: number; // readings the baseline is built from
}

export type BaselineSet = Partial<Record<BaselineMetric, Baseline>>;

export function median(values: number[]): number {
  if (values.length === 0) {
    return NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function medianAbsoluteDeviation(values: number[]): number {
  if (values.length === 0) {
    return NaN;
  }
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return low === high
    ? sorted[low]
    : sorted[low] + (rank - low) * (sorted[high] - sorted[low]);
}

function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

/**
 * Rolling baseline for one metric on one day, from the preceding `windowDays`.
 *
 * Returns null when fewer than `minReadings` are available — a baseline built
 * from three nights is not a baseline, and silently returning one would let
 * every downstream feature quote confident nonsense.
 */
export function rollingBaseline(
  readings: NightlyReading[],
  day: string,
  metric: BaselineMetric,
  windowDays = 30,
  minReadings = 10
): Baseline | null {
  const target = dayNumber(day);

  const values = readings
    .filter((reading) => {
      const offset = target - dayNumber(reading.day);
      return offset >= 1 && offset <= windowDays; // strictly before `day`
    })
    .map((reading) => reading[metric])
    .filter((value): value is number => value !== null && isFinite(value));

  if (values.length < minReadings) {
    return null;
  }

  return {
    median: median(values),
    mad: medianAbsoluteDeviation(values),
    n: values.length,
  };
}

export function baselinesFor(
  readings: NightlyReading[],
  day: string,
  windowDays = 30,
  minReadings = 10
): BaselineSet {
  const metrics: BaselineMetric[] = [
    "hrv",
    "restingHr",
    "sleepHours",
    "deepHours",
    "tempDeviation",
  ];

  const out: BaselineSet = {};
  for (const metric of metrics) {
    const baseline = rollingBaseline(readings, day, metric, windowDays, minReadings);
    if (baseline) {
      out[metric] = baseline;
    }
  }
  return out;
}

/** How far a value sits from baseline, in MAD units (robust z-score). */
export function deviation(value: number | null, baseline: Baseline | null): number | null {
  if (value === null || !baseline || !isFinite(value)) {
    return null;
  }
  // A zero MAD means a perfectly flat window; report raw difference direction
  // rather than dividing by zero.
  if (baseline.mad === 0) {
    return value === baseline.median ? 0 : value > baseline.median ? Infinity : -Infinity;
  }
  return (value - baseline.median) / baseline.mad;
}

interface SleepPeriodPayload {
  day?: string;
  type?: string;
  average_hrv?: number | null;
  lowest_heart_rate?: number | null;
  total_sleep_duration?: number | null;
  deep_sleep_duration?: number | null;
  rem_sleep_duration?: number | null;
  efficiency?: number | null;
  hrv?: { items?: (number | null)[]; interval?: number; timestamp?: string } | null;
}

interface DailyPayload {
  day?: string;
  score?: number | null;
  temperature_deviation?: number | null;
}

/**
 * Folds Oura's sleep periods and daily documents into one reading per night.
 *
 * Naps are excluded: Oura marks the main sleep as `long_sleep`, and averaging a
 * 20-minute nap into the night would corrupt both HRV and duration. When a day
 * has no `long_sleep`, the longest period is used as a fallback.
 */
export function buildNightlyReadings(input: {
  sleepPeriods: SleepPeriodPayload[];
  readiness: DailyPayload[];
  dailySleep: DailyPayload[];
}): NightlyReading[] {
  const mainSleepByDay = new Map<string, SleepPeriodPayload>();

  for (const period of input.sleepPeriods) {
    if (!period.day) {
      continue;
    }

    const existing = mainSleepByDay.get(period.day);

    if (!existing) {
      mainSleepByDay.set(period.day, period);
      continue;
    }

    const existingIsMain = existing.type === "long_sleep";
    const candidateIsMain = period.type === "long_sleep";

    if (candidateIsMain && !existingIsMain) {
      mainSleepByDay.set(period.day, period);
    } else if (candidateIsMain === existingIsMain) {
      const longer =
        (period.total_sleep_duration ?? 0) > (existing.total_sleep_duration ?? 0);
      if (longer) {
        mainSleepByDay.set(period.day, period);
      }
    }
  }

  const readinessByDay = new Map(
    input.readiness.filter((row) => row.day).map((row) => [row.day as string, row])
  );
  const sleepScoreByDay = new Map(
    input.dailySleep.filter((row) => row.day).map((row) => [row.day as string, row])
  );

  const days = new Set<string>([
    ...mainSleepByDay.keys(),
    ...readinessByDay.keys(),
    ...sleepScoreByDay.keys(),
  ]);

  const hours = (seconds: number | null | undefined): number | null =>
    seconds === null || seconds === undefined ? null : seconds / 3600;

  return [...days]
    .sort()
    .map((day) => {
      const sleep = mainSleepByDay.get(day);
      const readiness = readinessByDay.get(day);

      return {
        day,
        hrv: sleep?.average_hrv ?? null,
        restingHr: sleep?.lowest_heart_rate ?? null,
        sleepHours: hours(sleep?.total_sleep_duration),
        deepHours: hours(sleep?.deep_sleep_duration),
        remHours: hours(sleep?.rem_sleep_duration),
        efficiency: sleep?.efficiency ?? null,
        tempDeviation: readiness?.temperature_deviation ?? null,
        readinessScore: readiness?.score ?? null,
        sleepScore: sleepScoreByDay.get(day)?.score ?? null,
      };
    });
}
