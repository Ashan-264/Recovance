/**
 * F7 / F8 / F9 / F15 — features built on matched descent runs.
 *
 * The unit of comparison is a "trail": descent runs whose start point, end
 * point and vertical drop agree. Everything here compares an athlete's runs
 * of a trail against their other runs of the SAME trail — cross-trail
 * comparison is the validity trap this module exists to avoid.
 */
import { median } from "./baselines";
import type { NightlyReading } from "./baselines";
import { correlate } from "./stats";
import type { DescentRun } from "./loadSplit";

export interface RunOnTrail extends DescentRun {
  day: string; // ride date
  rideType: string;
}

export interface Trail {
  key: string;
  runs: RunOnTrail[]; // chronological
  verticalMetres: number;
}

/** Groups runs into trails; only trails ridden ≥minRuns times are kept. */
export function matchTrails(runs: RunOnTrail[], minRuns = 3): Trail[] {
  const byKey = new Map<string, RunOnTrail[]>();

  for (const run of runs) {
    if (!run.trailKey) {
      continue;
    }
    const list = byKey.get(run.trailKey) ?? [];
    list.push(run);
    byKey.set(run.trailKey, list);
  }

  return [...byKey.entries()]
    .filter(([, list]) => list.length >= minRuns)
    .map(([key, list]) => ({
      key,
      runs: [...list].sort((a, b) => a.day.localeCompare(b.day)),
      verticalMetres: median(list.map((run) => run.verticalMetres)) ?? 0,
    }))
    .sort((a, b) => b.runs.length - a.runs.length);
}

// ---------------------------------------------------------------------------
// F7 — Descent skill score
// ---------------------------------------------------------------------------

export interface TrailProgress {
  key: string;
  runs: number;
  verticalMetres: number;
  firstDay: string;
  lastDay: string;
  /** Braking events per km, first vs latest runs — the skill signal. */
  earlyDecelPerKm: number | null;
  lateDecelPerKm: number | null;
  earlySeconds: number | null;
  lateSeconds: number | null;
}

export interface DescentSkillResult {
  trails: number;
  scoredRuns: number;
  /** Median % change in braking events/km from early to late runs. */
  medianBrakingChange: number | null;
  medianTimeChange: number | null;
  /** Lag-1 consistency of decel/km on the same trail (Spearman). */
  reliability: { rho: number; n: number; ok: boolean } | null;
  topTrails: TrailProgress[];
}

function half<T>(list: T[], which: "early" | "late"): T[] {
  const size = Math.max(1, Math.floor(list.length / 3));
  return which === "early" ? list.slice(0, size) : list.slice(-size);
}

/**
 * Smoother, less brake-stabby descending on the same trail over time.
 *
 * The headline is the change in braking events per km between a trail's early
 * and late runs. A test-retest reliability figure ships with it: if the metric
 * does not correlate run-to-run on the same trail, it is noise and the card
 * must say so instead of trending it.
 */
export function descentSkill(trails: Trail[]): DescentSkillResult {
  const progresses: TrailProgress[] = [];
  const brakingChanges: number[] = [];
  const timeChanges: number[] = [];
  const lagPairs: [number, number][] = [];

  for (const trail of trails) {
    const scoreable = trail.runs.filter((run) => run.decelPerKm !== null);
    if (scoreable.length < 3) {
      continue;
    }

    for (let i = 0; i + 1 < scoreable.length; i++) {
      lagPairs.push([scoreable[i].decelPerKm!, scoreable[i + 1].decelPerKm!]);
    }

    const early = half(scoreable, "early");
    const late = half(scoreable, "late");

    const earlyDecel = median(early.map((run) => run.decelPerKm!));
    const lateDecel = median(late.map((run) => run.decelPerKm!));
    const earlySeconds = median(early.map((run) => run.seconds));
    const lateSeconds = median(late.map((run) => run.seconds));

    if (earlyDecel !== null && lateDecel !== null && earlyDecel > 0) {
      brakingChanges.push(((lateDecel - earlyDecel) / earlyDecel) * 100);
    }
    if (earlySeconds !== null && lateSeconds !== null && earlySeconds > 0) {
      timeChanges.push(((lateSeconds - earlySeconds) / earlySeconds) * 100);
    }

    progresses.push({
      key: trail.key,
      runs: scoreable.length,
      verticalMetres: Math.round(trail.verticalMetres),
      firstDay: scoreable[0].day,
      lastDay: scoreable[scoreable.length - 1].day,
      earlyDecelPerKm: earlyDecel,
      lateDecelPerKm: lateDecel,
      earlySeconds,
      lateSeconds,
    });
  }

  const reliability = correlate(lagPairs);

  return {
    trails: progresses.length,
    scoredRuns: progresses.reduce((sum, trail) => sum + trail.runs, 0),
    medianBrakingChange:
      progresses.length >= 3 ? median(brakingChanges) : null,
    medianTimeChange: progresses.length >= 3 ? median(timeChanges) : null,
    reliability: reliability
      ? {
          rho: reliability.rho,
          n: reliability.n,
          // The plan's bar: r ≥ 0.5 or the score is noise.
          ok: reliability.rho >= 0.5 && !reliability.inconclusive,
        }
      : null,
    topTrails: progresses.slice(0, 6),
  };
}

// ---------------------------------------------------------------------------
// F8 — Fear / arousal proxy
// ---------------------------------------------------------------------------

export interface ArousalResult {
  trails: number;
  runsWithHr: number;
  /** Median arousal (descent HR − ride baseline HR) on early vs late runs. */
  earlyArousal: number | null;
  lateArousal: number | null;
  changeBpm: number | null;
}

/**
 * Heart rate on a descent, where mechanical work is near zero, is arousal.
 * Falling arousal across repeats of the same trail is confidence made visible.
 */
export function fearArousal(trails: Trail[]): ArousalResult {
  const earlies: number[] = [];
  const lates: number[] = [];
  let qualifying = 0;
  let runsWithHr = 0;

  for (const trail of trails) {
    const withHr = trail.runs.filter(
      (run) => run.meanHr !== null && run.rideP10Hr !== null
    );
    runsWithHr += withHr.length;

    if (withHr.length < 4) {
      continue;
    }
    qualifying++;

    const arousal = (run: RunOnTrail) => run.meanHr! - run.rideP10Hr!;
    const early = median(half(withHr, "early").map(arousal));
    const late = median(half(withHr, "late").map(arousal));

    if (early !== null) earlies.push(early);
    if (late !== null) lates.push(late);
  }

  const earlyMedian = qualifying >= 2 ? median(earlies) : null;
  const lateMedian = qualifying >= 2 ? median(lates) : null;

  return {
    trails: qualifying,
    runsWithHr,
    earlyArousal: earlyMedian,
    lateArousal: lateMedian,
    changeBpm:
      earlyMedian !== null && lateMedian !== null
        ? lateMedian - earlyMedian
        : null,
  };
}

// ---------------------------------------------------------------------------
// F9 — Effort-normalized trail progression
// ---------------------------------------------------------------------------

export type ProgressKind =
  | "skill" // faster at the same effort
  | "fitness" // same speed at lower effort
  | "both"
  | "regressing"
  | "flat";

export interface TrailClassification {
  key: string;
  runs: number;
  verticalMetres: number;
  timeChangePercent: number;
  hrChangeBpm: number | null;
  kind: ProgressKind;
}

export interface ProgressionResult {
  trails: TrailClassification[];
  counts: Record<ProgressKind, number>;
}

/**
 * Separates "got fitter" from "got better": lower time at the same HR is
 * skill; the same time at lower HR is fitness. Strava's PR list conflates the
 * two — this is the disentangling.
 */
export function trailProgression(trails: Trail[]): ProgressionResult {
  const classifications: TrailClassification[] = [];

  for (const trail of trails) {
    const clean = trail.runs.filter((run) => run.seconds > 0);
    if (clean.length < 4) {
      continue;
    }

    const early = half(clean, "early");
    const late = half(clean, "late");

    const earlyTime = median(early.map((run) => run.seconds))!;
    const lateTime = median(late.map((run) => run.seconds))!;
    const timeChange = ((lateTime - earlyTime) / earlyTime) * 100;

    const earlyHrRuns = early.filter((run) => run.meanHr !== null);
    const lateHrRuns = late.filter((run) => run.meanHr !== null);
    const hrChange =
      earlyHrRuns.length > 0 && lateHrRuns.length > 0
        ? median(lateHrRuns.map((run) => run.meanHr!))! -
          median(earlyHrRuns.map((run) => run.meanHr!))!
        : null;

    const faster = timeChange < -5;
    const slower = timeChange > 5;
    const easier = hrChange !== null && hrChange < -3;
    const harder = hrChange !== null && hrChange > 3;

    let kind: ProgressKind = "flat";
    if (faster && easier) kind = "both";
    else if (faster && !harder) kind = "skill";
    else if (!slower && easier) kind = "fitness";
    else if (slower || harder) kind = "regressing";

    classifications.push({
      key: trail.key,
      runs: clean.length,
      verticalMetres: Math.round(trail.verticalMetres),
      timeChangePercent: timeChange,
      hrChangeBpm: hrChange,
      kind,
    });
  }

  const counts: Record<ProgressKind, number> = {
    skill: 0,
    fitness: 0,
    both: 0,
    regressing: 0,
    flat: 0,
  };
  for (const trail of classifications) {
    counts[trail.kind]++;
  }

  return { trails: classifications, counts };
}

// ---------------------------------------------------------------------------
// F15 — Sleep-debt weekend pattern
// ---------------------------------------------------------------------------

export interface SleepDebtResult {
  weekends: number;
  qualifyingWeekends: number;
  /** Spearman: weekday sleep debt vs weekend braking events/km. */
  correlation: { rho: number; n: number; inconclusive: boolean } | null;
  /** Median weekend decel/km after low-debt vs high-debt weeks. */
  lowDebtDecel: number | null;
  highDebtDecel: number | null;
}

/**
 * Does the week's sleep show up in the weekend's riding?
 *
 * Debt is hours below the athlete's own median weekday sleep, summed Mon–Fri;
 * the outcome is braking events/km across that weekend's descent runs. Both
 * sides come from the athlete's own data; n is reported and small n means the
 * verdict is "not enough overlap", not a fabricated trend.
 */
export function sleepDebtWeekends(
  runsByDay: Map<string, RunOnTrail[]>,
  readings: NightlyReading[]
): SleepDebtResult {
  const sleepByDay = new Map(
    readings
      .filter((reading) => reading.sleepHours !== null)
      .map((reading) => [reading.day, reading.sleepHours as number])
  );

  const weekdaySleep = readings.filter((reading) => {
    if (reading.sleepHours === null) return false;
    const weekday = new Date(`${reading.day}T00:00:00Z`).getUTCDay();
    return weekday >= 1 && weekday <= 5;
  });
  const weekdayMedian = median(
    weekdaySleep.map((reading) => reading.sleepHours as number)
  );

  if (weekdayMedian === null) {
    return {
      weekends: 0,
      qualifyingWeekends: 0,
      correlation: null,
      lowDebtDecel: null,
      highDebtDecel: null,
    };
  }

  // Collect weekends that have scored descent runs.
  interface WeekendSample {
    debt: number;
    decelPerKm: number;
    nights: number;
  }
  const samples: WeekendSample[] = [];
  const weekendDays = [...runsByDay.keys()].filter((day) => {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    return weekday === 0 || weekday === 6;
  });

  // Group Sat/Sun pairs by their Saturday.
  const weekends = new Map<string, string[]>();
  for (const day of weekendDays) {
    const date = new Date(`${day}T00:00:00Z`);
    const saturday = new Date(date);
    saturday.setUTCDate(date.getUTCDate() - (date.getUTCDay() === 0 ? 1 : 0));
    const key = saturday.toISOString().slice(0, 10);
    const list = weekends.get(key) ?? [];
    list.push(day);
    weekends.set(key, list);
  }

  for (const [saturday, days] of weekends) {
    const satDate = new Date(`${saturday}T00:00:00Z`);

    // Debt over the preceding Mon–Fri, needing at least 3 nights of data.
    let debt = 0;
    let nights = 0;
    for (let offset = 5; offset >= 1; offset--) {
      const day = new Date(satDate);
      day.setUTCDate(satDate.getUTCDate() - offset);
      const sleep = sleepByDay.get(day.toISOString().slice(0, 10));
      if (sleep !== undefined) {
        nights++;
        debt += Math.max(0, weekdayMedian - sleep);
      }
    }
    if (nights < 3) {
      continue;
    }

    const decels = days
      .flatMap((day) => runsByDay.get(day) ?? [])
      .map((run) => run.decelPerKm)
      .filter((value): value is number => value !== null);
    if (decels.length === 0) {
      continue;
    }

    samples.push({ debt, decelPerKm: median(decels)!, nights });
  }

  const correlation = correlate(
    samples.map((sample) => [sample.debt, sample.decelPerKm])
  );

  const debts = samples.map((sample) => sample.debt);
  const debtMedian = median(debts);
  const low =
    debtMedian !== null
      ? samples.filter((sample) => sample.debt <= debtMedian)
      : [];
  const high =
    debtMedian !== null
      ? samples.filter((sample) => sample.debt > debtMedian)
      : [];

  return {
    weekends: weekends.size,
    qualifyingWeekends: samples.length,
    correlation: correlation
      ? {
          rho: correlation.rho,
          n: correlation.n,
          inconclusive: correlation.inconclusive,
        }
      : null,
    lowDebtDecel:
      low.length >= 5 ? median(low.map((s) => s.decelPerKm)) : null,
    highDebtDecel:
      high.length >= 5 ? median(high.map((s) => s.decelPerKm)) : null,
  };
}
