/**
 * F2 / F3 / F5 — the day-verdict features.
 *
 * Unlike the trend metrics, these answer a question about ONE morning: "should
 * today be a send day?", "is this illness or just training?". With the as-of
 * picker they evaluate any past day using only what was known by then — gates
 * included, so a day inside a dense ring-wear period can be live even though
 * today is not.
 */
import {
  NightlyReading,
  percentile,
  rollingBaseline,
} from "./baselines";
import type { ActivitySummary } from "./features";
import { sessionTypeOf } from "./features";
import type { RideLoadSummary } from "./loadSplit";

const DAY_MS = 86_400_000;

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// F3 — Send-day gate
// ---------------------------------------------------------------------------

export interface GateSignal {
  key: string;
  label: string;
  value: number | null;
  threshold: string;
  triggered: boolean | null; // null = no data for this signal
}

export interface SendDayResult {
  day: string;
  verdict: "green" | "caution" | "red" | "no-data";
  technicalDay: boolean;
  rideThatDay: string | null;
  signals: GateSignal[];
  priorReadings: number;
  /** Share of the trailing 90 ride-days the gate could actually score. */
  rideDayCoverage: { scored: number; rideDays: number };
}

/**
 * The morning check before a consequence-heavy ride.
 *
 * Red needs two independent signals — readiness under the athlete's own 20th
 * percentile, temperature more than +0.4 °C over baseline, or under 6.5 h of
 * sleep. One signal is caution. The verdict is computed for the given day from
 * data available up to it, so past mornings can be replayed.
 */
export function sendDayGate(
  readings: NightlyReading[],
  summaries: RideLoadSummary[],
  activities: ActivitySummary[],
  day: string
): SendDayResult {
  const prior = readings.filter((reading) => reading.day < day);
  const today = readings.find((reading) => reading.day === day) ?? null;

  const readinessHistory = prior
    .map((reading) => reading.readinessScore)
    .filter((value): value is number => value !== null);
  const p20 =
    readinessHistory.length >= 30 ? percentile(readinessHistory, 20) : null;

  const rides = activities.filter(
    (activity) =>
      activity.day === day &&
      (sessionTypeOf(activity.type) === "mtb" ||
        sessionTypeOf(activity.type) === "road")
  );
  const summary = summaries.find((s) => s.day === day);
  const technicalDay =
    rides.some((ride) => ride.type === "MountainBikeRide") ||
    (summary !== undefined && summary.descentShare >= 0.25);

  const signals: GateSignal[] = [
    {
      key: "readiness",
      label: "Readiness vs your 20th percentile",
      value: today?.readinessScore ?? null,
      threshold: p20 === null ? "needs 30 prior nights" : `< ${p20.toFixed(0)}`,
      triggered:
        today?.readinessScore != null && p20 !== null
          ? today.readinessScore < p20
          : null,
    },
    {
      key: "temperature",
      label: "Temperature deviation",
      value: today?.tempDeviation ?? null,
      threshold: "> +0.4 °C",
      triggered:
        today?.tempDeviation != null ? today.tempDeviation > 0.4 : null,
    },
    {
      key: "sleep",
      label: "Sleep duration",
      value: today?.sleepHours ?? null,
      threshold: "< 6.5 h",
      triggered: today?.sleepHours != null ? today.sleepHours < 6.5 : null,
    },
  ];

  const known = signals.filter((signal) => signal.triggered !== null);
  const triggered = signals.filter((signal) => signal.triggered === true);

  let verdict: SendDayResult["verdict"];
  if (known.length === 0) {
    verdict = "no-data";
  } else if (triggered.length >= 2) {
    verdict = "red";
  } else if (triggered.length === 1) {
    verdict = "caution";
  } else {
    verdict = "green";
  }

  // How often could this gate have worked lately? Honest coverage readout.
  const windowStart = addDays(day, -90);
  const readingDays = new Set(readings.map((reading) => reading.day));
  const recentRideDays = [
    ...new Set(
      activities
        .filter(
          (activity) =>
            activity.day > windowStart &&
            activity.day <= day &&
            (sessionTypeOf(activity.type) === "mtb" ||
              sessionTypeOf(activity.type) === "road")
        )
        .map((activity) => activity.day)
    ),
  ];

  return {
    day,
    verdict,
    technicalDay,
    rideThatDay: rides[0]?.type ?? null,
    signals,
    priorReadings: readinessHistory.length,
    rideDayCoverage: {
      scored: recentRideDays.filter((rideDay) => readingDays.has(rideDay)).length,
      rideDays: recentRideDays.length,
    },
  };
}

/** Gate A for F3 on a given day: that morning has data and percentiles exist. */
export function sendDayGateReady(result: SendDayResult): boolean {
  return result.verdict !== "no-data" && result.priorReadings >= 30;
}

// ---------------------------------------------------------------------------
// F5 — Illness / overreach early warning
// ---------------------------------------------------------------------------

export interface IllnessResult {
  day: string;
  verdict: "clear" | "illness-watch" | "overreach-watch" | "red" | "no-data";
  tempDeviation: number | null;
  restingHr: number | null;
  restingHrThreshold: number | null; // baseline median + MAD
  acuteChronicRatio: number | null;
  wear60: { nights: number; of: number };
}

/**
 * Separates "getting sick" from "trained too hard": temperature and resting
 * heart rate against the athlete's own baseline, crossed with the acute:chronic
 * training-load ratio. All three → red; body signals without a load spike →
 * illness watch; load spike with one body signal → overreach watch.
 */
export function illnessWarning(
  readings: NightlyReading[],
  activities: ActivitySummary[],
  day: string
): IllnessResult {
  const today = readings.find((reading) => reading.day === day) ?? null;

  // Ring wear in the trailing 60 days — the gate this feature stands on.
  const readingDays = new Set(
    readings
      .filter((reading) => reading.hrv !== null || reading.restingHr !== null)
      .map((reading) => reading.day)
  );
  let wearNights = 0;
  for (let offset = 1; offset <= 60; offset++) {
    if (readingDays.has(addDays(day, -offset))) {
      wearNights++;
    }
  }

  const rhrBaseline = rollingBaseline(readings, day, "restingHr", 60, 20);
  const rhrThreshold =
    rhrBaseline !== null ? rhrBaseline.median + Math.max(1, rhrBaseline.mad) : null;

  // Acute:chronic on moving time: last 7 days vs the 28-day weekly average.
  const minutesOn = (from: string, to: string) =>
    activities
      .filter((activity) => activity.day > from && activity.day <= to)
      .reduce((sum, activity) => sum + activity.movingSeconds / 60, 0);
  const acute = minutesOn(addDays(day, -7), day);
  const chronicWeekly = minutesOn(addDays(day, -28), day) / 4;
  const acr = chronicWeekly > 30 ? acute / chronicWeekly : null;

  const tempHigh = today?.tempDeviation != null && today.tempDeviation > 0.4;
  const rhrHigh =
    today?.restingHr != null &&
    rhrThreshold !== null &&
    today.restingHr > rhrThreshold;
  const loadSpike = acr !== null && acr > 1.3;

  let verdict: IllnessResult["verdict"];
  if (!today || (today.tempDeviation === null && today.restingHr === null)) {
    verdict = "no-data";
  } else if (tempHigh && rhrHigh && loadSpike) {
    verdict = "red";
  } else if (tempHigh && rhrHigh) {
    verdict = "illness-watch";
  } else if (loadSpike && (tempHigh || rhrHigh)) {
    verdict = "overreach-watch";
  } else {
    verdict = "clear";
  }

  return {
    day,
    verdict,
    tempDeviation: today?.tempDeviation ?? null,
    restingHr: today?.restingHr ?? null,
    restingHrThreshold: rhrThreshold,
    acuteChronicRatio: acr,
    wear60: { nights: wearNights, of: 60 },
  };
}

/** Gate A for F5 as of a day: ≥60% wear in the trailing 60 days. */
export function illnessWarningReady(result: IllnessResult): boolean {
  return result.wear60.nights / result.wear60.of >= 0.6 && result.verdict !== "no-data";
}

// ---------------------------------------------------------------------------
// F2 — Interference index (status only until sessions carry a quality tag)
// ---------------------------------------------------------------------------

export interface InterferenceStatus {
  day: string;
  strengthSessions: number;
  taggedSessions: number;
  needed: number;
}

/**
 * The honest state of F2 as of a date: how many strength sessions existed and
 * how many carried a quality tag. The metric itself stays parked until tagged
 * sessions reach the floor — there is no defensible quality proxy without RPE,
 * and duration-as-quality would manufacture a conclusion.
 */
export function interferenceStatus(
  activities: ActivitySummary[],
  day: string
): InterferenceStatus {
  const strength = activities.filter(
    (activity) =>
      activity.day <= day && sessionTypeOf(activity.type) === "strength"
  );

  return {
    day,
    strengthSessions: strength.length,
    taggedSessions: 0, // manual RPE logging is not built yet
    needed: 30,
  };
}


// ---------------------------------------------------------------------------
// "Last day this feature works" — hints for parked cards
// ---------------------------------------------------------------------------

/**
 * Most recent day the send-day gate can produce a verdict: the day has a
 * reading and at least 30 readiness scores exist before it.
 */
export function lastSendDayGateDay(readings: NightlyReading[]): string | null {
  const sorted = [...readings].sort((a, b) => a.day.localeCompare(b.day));
  let readinessCount = 0;
  const countsByIndex: number[] = sorted.map((reading) => {
    const prior = readinessCount;
    if (reading.readinessScore !== null) readinessCount++;
    return prior;
  });

  for (let index = sorted.length - 1; index >= 0; index--) {
    const reading = sorted[index];
    const hasSignal =
      reading.readinessScore !== null ||
      reading.tempDeviation !== null ||
      reading.sleepHours !== null;
    if (hasSignal && countsByIndex[index] >= 30) {
      return reading.day;
    }
  }
  return null;
}

/**
 * Most recent day the illness warning's wear gate passes: the day has a
 * reading and ≥36 of the 60 nights before it were worn.
 */
export function lastIllnessDay(readings: NightlyReading[]): string | null {
  const wearDays = readings
    .filter((reading) => reading.hrv !== null || reading.restingHr !== null)
    .map((reading) => reading.day)
    .sort();
  const waerSet = new Set(wearDays);

  for (let index = wearDays.length - 1; index >= 0; index--) {
    const day = wearDays[index];
    let nights = 0;
    for (let offset = 1; offset <= 60; offset++) {
      if (waerSet.has(addDays(day, -offset))) nights++;
    }
    if (nights >= 36) {
      return day;
    }
  }
  return null;
}
