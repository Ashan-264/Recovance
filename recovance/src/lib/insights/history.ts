/**
 * Per-feature history: each metric recomputed over stepped trailing windows,
 * so "how has this changed?" is answered by the same pure functions that
 * produce today's number — never a separately maintained series that could
 * drift from the live definition.
 *
 * Windows are 90 days, stepped monthly. A window with too little data yields
 * null values with its n, and the chart shows a gap — absence stays visible.
 */
import type { InsightInputs } from "./inputs";
import { median } from "./baselines";
import {
  recoveryCost,
  recoveryLatency,
  restDayAudit,
  disciplineDrift,
} from "./features";
import { matchTrails, sleepDebtWeekends } from "./trailFeatures";
import type { RunOnTrail } from "./trailFeatures";

export interface HistorySeries {
  key: string;
  label: string;
  unit: string;
}

export interface HistoryPoint {
  windowEnd: string; // YYYY-MM-DD
  n: number;
  values: Record<string, number | null>;
}

export interface FeatureHistory {
  feature: string;
  windowDays: number;
  series: HistorySeries[];
  points: HistoryPoint[];
  note?: string;
}

const WINDOW_DAYS = 90;
const STEP_DAYS = 30;
const DAY_MS = 86_400_000;

interface Window {
  start: string;
  end: string;
}

function buildWindows(days: string[]): Window[] {
  if (days.length === 0) {
    return [];
  }
  const sorted = [...days].sort();
  const first = Date.parse(`${sorted[0]}T00:00:00Z`);
  const last = Date.parse(`${sorted[sorted.length - 1]}T00:00:00Z`);

  const windows: Window[] = [];
  // Walk window ends from (first + WINDOW) to last, stepping monthly, capped
  // to keep the response bounded on very long histories.
  for (
    let end = first + WINDOW_DAYS * DAY_MS;
    end <= last + STEP_DAYS * DAY_MS;
    end += STEP_DAYS * DAY_MS
  ) {
    const clamped = Math.min(end, last);
    windows.push({
      start: new Date(clamped - WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10),
      end: new Date(clamped).toISOString().slice(0, 10),
    });
    if (clamped === last) break;
  }

  return windows.slice(-48);
}

function inWindow(day: string, window: Window): boolean {
  return day > window.start && day <= window.end;
}

export function computeHistory(
  feature: string,
  inputs: InsightInputs
): FeatureHistory | null {
  switch (feature) {
    case "F1": {
      // Recovery cost per bucket. Baselines always see the full history, so a
      // window near the start is judged against the same reference the live
      // number uses.
      const windows = buildWindows(inputs.activities.map((a) => a.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "mtb", label: "Mountain bike", unit: "ms" },
          { key: "road", label: "Road / other ride", unit: "ms" },
          { key: "strength", label: "Strength", unit: "ms" },
        ],
        points: windows.map((window) => {
          const result = recoveryCost(
            inputs.activities.filter((a) => inWindow(a.day, window)),
            inputs.readings
          );
          const value = (bucket: string) => {
            const entry = result.buckets.find((b) => b.sessionType === bucket);
            return entry && !entry.insufficient ? entry.hrvDelta : null;
          };
          return {
            windowEnd: window.end,
            n: result.totalPairs,
            values: {
              mtb: value("mtb"),
              road: value("road"),
              strength: value("strength"),
            },
          };
        }),
        note:
          "Gaps are windows where a session type had fewer than 8 activity→next-night pairs (usually sparse ring wear), so no number is shown.",
      };
    }

    case "F4": {
      const windows = buildWindows(inputs.hrvNights.map((night) => night.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "afterTraining", label: "After training", unit: "h" },
          { key: "afterRest", label: "After rest", unit: "h" },
        ],
        points: windows.map((window) => {
          const result = recoveryLatency(
            inputs.hrvNights.filter((night) => inWindow(night.day, window)),
            inputs.readings,
            inputs.trainingDays
          );
          return {
            windowEnd: window.end,
            n: result.n,
            values: {
              afterTraining: result.afterTraining.medianHours,
              afterRest: result.afterRest.medianHours,
            },
          };
        }),
      };
    }

    case "F6": {
      const windows = buildWindows(inputs.stressDays.map((day) => day.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "restful", label: "After calm rest day", unit: "ms" },
          { key: "stressful", label: "After stressful rest day", unit: "ms" },
        ],
        points: windows.map((window) => {
          const result = restDayAudit(
            inputs.stressDays.filter((day) => inWindow(day.day, window)),
            inputs.trainingDays,
            inputs.readings
          );
          return {
            windowEnd: window.end,
            n: result.scored,
            values: {
              restful: result.nextNightHrvAfterRestful,
              stressful: result.nextNightHrvAfterStressful,
            },
          };
        }),
      };
    }

    case "F7": {
      const windows = buildWindows(inputs.descentRuns.map((run) => run.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [{ key: "decelPerKm", label: "Braking events per km", unit: "/km" }],
        points: windows.map((window) => {
          const values = inputs.descentRuns
            .filter((run) => inWindow(run.day, window))
            .map((run) => run.decelPerKm)
            .filter((value): value is number => value !== null);
          return {
            windowEnd: window.end,
            n: values.length,
            values: { decelPerKm: values.length >= 5 ? median(values) : null },
          };
        }),
        note: "Raw braking frequency across all scored descents in each window — lower is smoother.",
      };
    }

    case "F8": {
      const windows = buildWindows(inputs.descentRuns.map((run) => run.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "arousal", label: "Descent HR over ride baseline", unit: "bpm" },
        ],
        points: windows.map((window) => {
          const values = inputs.descentRuns
            .filter(
              (run) =>
                inWindow(run.day, window) &&
                run.meanHr !== null &&
                run.rideP10Hr !== null
            )
            .map((run) => (run.meanHr as number) - (run.rideP10Hr as number));
          return {
            windowEnd: window.end,
            n: values.length,
            values: { arousal: values.length >= 5 ? median(values) : null },
          };
        }),
      };
    }

    case "F9": {
      // Runs normalized against their own trail's median time: <1 is faster
      // than typical for that trail, so different trails can share an axis.
      const trails = matchTrails(inputs.descentRuns);
      const medianByTrail = new Map<string, number>();
      for (const trail of trails) {
        const m = median(trail.runs.map((run) => run.seconds));
        if (m !== null && m > 0) {
          medianByTrail.set(trail.key, m);
        }
      }
      const normalized = inputs.descentRuns
        .filter((run) => run.trailKey && medianByTrail.has(run.trailKey))
        .map((run) => ({
          day: run.day,
          value: run.seconds / medianByTrail.get(run.trailKey as string)!,
        }));

      const windows = buildWindows(normalized.map((entry) => entry.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          {
            key: "relativeTime",
            label: "Run time vs trail median (1.0 = typical)",
            unit: "×",
          },
        ],
        points: windows.map((window) => {
          const values = normalized
            .filter((entry) => inWindow(entry.day, window))
            .map((entry) => entry.value);
          return {
            windowEnd: window.end,
            n: values.length,
            values: { relativeTime: values.length >= 5 ? median(values) : null },
          };
        }),
        note: "Below 1.0 means runs in that period were faster than each trail's own typical time.",
      };
    }

    case "F10": {
      const rides = inputs.withSegments;
      const windows = buildWindows(rides.map((ride) => ride.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [{ key: "decay", label: "Climb VAM decay", unit: "%" }],
        points: windows.map((window) => {
          // Reuses the per-ride definition: first-vs-last comparable climbs.
          const decays: number[] = [];
          for (const ride of rides.filter((r) => inWindow(r.day, window))) {
            const climbs = ride.segments.filter(
              (segment) =>
                segment.kind === "climb" &&
                segment.seconds >= 180 &&
                segment.verticalMetres >= 30
            );
            if (climbs.length < 3) continue;
            const first = climbs[0];
            const last = climbs[climbs.length - 1];
            if (Math.abs(first.meanGrade - last.meanGrade) > 3) continue;
            const vam = (s: (typeof climbs)[number]) =>
              (s.verticalMetres / s.seconds) * 3600;
            const firstVam = vam(first);
            if (firstVam <= 0) continue;
            decays.push(((firstVam - vam(last)) / firstVam) * 100);
          }
          return {
            windowEnd: window.end,
            n: decays.length,
            values: { decay: decays.length >= 3 ? median(decays) : null },
          };
        }),
      };
    }

    case "F11": {
      const rides = inputs.withSegments;
      const windows = buildWindows(rides.map((ride) => ride.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [{ key: "drift", label: "Cardiac drift on climbs", unit: "%" }],
        points: windows.map((window) => {
          const drifts: number[] = [];
          for (const ride of rides.filter((r) => inWindow(r.day, window))) {
            if (ride.movingSeconds < 3600) continue;
            const climbs = ride.segments.filter(
              (segment) =>
                segment.kind === "climb" &&
                segment.seconds >= 120 &&
                segment.verticalMetres >= 20 &&
                segment.meanHeartrate !== null &&
                segment.meanHeartrate > 60
            );
            if (climbs.length < 3) continue;
            const cost = (s: (typeof climbs)[number]) => {
              const vam = (s.verticalMetres / s.seconds) * 3600;
              return vam > 0 ? (s.meanHeartrate as number) / vam : NaN;
            };
            const third = Math.max(1, Math.floor(climbs.length / 3));
            const early = climbs.slice(0, third).map(cost).filter(isFinite);
            const late = climbs.slice(-third).map(cost).filter(isFinite);
            if (early.length === 0 || late.length === 0) continue;
            const earlyMedian = median(early);
            if (!earlyMedian || earlyMedian <= 0) continue;
            drifts.push(((median(late)! - earlyMedian) / earlyMedian) * 100);
          }
          return {
            windowEnd: window.end,
            n: drifts.length,
            values: { drift: drifts.length >= 3 ? median(drifts) : null },
          };
        }),
      };
    }

    case "F12": {
      const windows = buildWindows(inputs.summaries.map((s) => s.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "all", label: "All rides", unit: "%" },
          { key: "mtb", label: "Mountain bike", unit: "%" },
        ],
        points: windows.map((window) => {
          const rides = inputs.summaries.filter((s) => inWindow(s.day, window));
          const mtb = rides.filter((s) => s.type === "MountainBikeRide");
          const pct = (list: typeof rides) => {
            const m = median(list.map((s) => s.descentShare));
            return m === null ? null : m * 100;
          };
          return {
            windowEnd: window.end,
            n: rides.length,
            values: {
              all: rides.length >= 5 ? pct(rides) : null,
              mtb: mtb.length >= 3 ? pct(mtb) : null,
            },
          };
        }),
      };
    }

    case "F13": {
      const windows = buildWindows(inputs.withSegments.map((r) => r.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "gripLoad", label: "Descent (grip) load", unit: "index" },
        ],
        points: windows.map((window) => {
          const rides = inputs.withSegments.filter((r) =>
            inWindow(r.day, window)
          );
          const total = rides.reduce((sum, ride) => sum + ride.descentLoad, 0);
          return {
            windowEnd: window.end,
            n: rides.length,
            values: { gripLoad: rides.length > 0 ? Math.round(total) : null },
          };
        }),
      };
    }

    case "F14": {
      // Discipline drift is already a windowed series; reuse it directly.
      const drift = disciplineDrift(inputs.activities, 60);
      return {
        feature,
        windowDays: 28,
        series: [{ key: "ratio", label: "Strength : ride minutes", unit: ":1" }],
        points: drift.windows.map((window) => ({
          windowEnd: window.weekStart,
          n: window.strengthMinutes + window.rideMinutes,
          values: { ratio: window.ratio },
        })),
      };
    }

    case "F15": {
      // Its history IS the weekend samples; expose them chronologically.
      const runsByDay = new Map<string, RunOnTrail[]>();
      for (const run of inputs.descentRuns) {
        const list = runsByDay.get(run.day) ?? [];
        list.push(run);
        runsByDay.set(run.day, list);
      }
      const result = sleepDebtWeekends(runsByDay, inputs.readings);
      void result;
      const windows = buildWindows(inputs.descentRuns.map((run) => run.day));
      return {
        feature,
        windowDays: WINDOW_DAYS,
        series: [
          { key: "decel", label: "Weekend braking events/km", unit: "/km" },
        ],
        points: windows.map((window) => {
          const decels = [...runsByDay.entries()]
            .filter(([day]) => {
              const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
              return (
                (weekday === 0 || weekday === 6) && inWindow(day, window)
              );
            })
            .flatMap(([, runs]) => runs)
            .map((run) => run.decelPerKm)
            .filter((value): value is number => value !== null);
          return {
            windowEnd: window.end,
            n: decels.length,
            values: { decel: decels.length >= 5 ? median(decels) : null },
          };
        }),
        note: "Weekend descending roughness over time; pair with your sleep to see the F15 relationship build.",
      };
    }

    default:
      return null;
  }
}
