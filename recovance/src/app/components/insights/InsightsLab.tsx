"use client";

import React, { useEffect, useState } from "react";
import { FEATURE_GROUPS, FeatureDefinition } from "@/lib/insights/registry";
import type { LoadSplitAggregate } from "@/lib/insights/loadSplit";
import type {
  ClimbRepeatabilityResult,
  DurabilityResult,
  GripChainResult,
} from "@/lib/insights/streamFeatures";
import type {
  ArousalResult,
  DescentSkillResult,
  ProgressionResult,
  SleepDebtResult,
} from "@/lib/insights/trailFeatures";
import type {
  IllnessResult,
  InterferenceStatus,
  SendDayResult,
} from "@/lib/insights/gates";
import type {
  DisciplineDriftResult,
  RecoveryCostResult,
  RecoveryLatencyResult,
  RestDayAuditResult,
} from "@/lib/insights/features";

interface FeaturePayload extends FeatureDefinition {
  status: "live" | "parked";
  result: unknown;
  parkedContext?: unknown;
}

interface HistorySeriesMeta {
  key: string;
  label: string;
  unit: string;
}

interface HistoryPoint {
  windowEnd: string;
  n: number;
  values: Record<string, number | null>;
}

interface FeatureHistoryPayload {
  feature: string;
  windowDays: number;
  series: HistorySeriesMeta[];
  points: HistoryPoint[];
  note?: string;
}

interface InsightsResponse {
  features: FeaturePayload[];
  coverage: {
    activities: number;
    nightsWithHrv: number;
    nightsWithHrvSeries: number;
    stressDays: number;
    streams: number;
    ridesAnalyzed: number;
    pendingSplits: number;
  };
}

const POSITIVE = "#0cf2d0";
const NEGATIVE = "#f97362";

function signed(value: number, digits = 1): string {
  const rounded = value.toFixed(digits);
  return Number(rounded) > 0 ? `+${rounded}` : rounded;
}

/** Value with its sample size — no number is shown without the n behind it. */
function Stat({
  label,
  value,
  unit,
  n,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  n?: number;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? POSITIVE : tone === "bad" ? NEGATIVE : "#ffffff";

  return (
    <div className="min-w-[110px]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-xs text-[#9cbab5]">{unit}</span>}
      </div>
      {n !== undefined && (
        <div className="mt-1 text-[10px] text-[#7f9d98]">n = {n}</div>
      )}
    </div>
  );
}

function Card({
  feature,
  children,
}: {
  feature: FeaturePayload;
  children: React.ReactNode;
}) {
  const live = feature.status === "live";

  return (
    <div
      className={`rounded-xl border p-5 ${
        live
          ? "border-[#3b5450] bg-[#1e2a28]"
          : "border-[#2b3a38] bg-[#161f1e] opacity-80"
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-white">
          <span className="mr-2 text-xs font-mono text-[#7f9d98]">{feature.id}</span>
          {feature.name}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            live
              ? "bg-[#0cf2d0]/15 text-[#0cf2d0]"
              : "bg-[#3b5450]/40 text-[#9cbab5]"
          }`}
        >
          {live ? "Live" : "Needs data"}
        </span>
      </div>
      <p className="mb-3 text-sm text-[#9cbab5]">{feature.claim}</p>

      {/* The training decision this metric exists to inform. */}
      <details className="mb-3 rounded-lg border border-[#2b3a38] bg-[#151f1e] px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-[#0cf2d0] hover:text-[#7ff7e4]">
          How to use this
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-[#9cbab5]">
          {feature.howToUse}
        </p>
      </details>

      {children}
    </div>
  );
}

function ParkedBody({
  feature,
  onJump,
}: {
  feature: FeaturePayload;
  onJump?: (day: string) => void;
}) {
  // Measured state for the viewed day, when the API supplied it.
  const context = feature.parkedContext as
    | (Partial<InterferenceStatus> & Partial<IllnessResult> & Partial<SendDayResult>)
    | null;

  const lastLiveDay =
    (context as { lastLiveDay?: string | null } | null)?.lastLiveDay ?? null;

  let measured: string | null = null;
  if (context) {
    if (feature.id === "F2" && context.strengthSessions !== undefined) {
      measured = `${context.taggedSessions}/${context.needed} tagged sessions (${context.strengthSessions} strength sessions exist, none tagged yet).`;
    } else if (feature.id === "F5" && context.wear60) {
      measured = `Ring worn ${context.wear60.nights}/60 nights before ${context.day} — needs 36+. Pick a day inside a dense wear period (mid-2023 to early 2024) to see it work.`;
    } else if (feature.id === "F3" && context.day) {
      measured = `No ring reading on ${context.day}. Pick a day the ring was worn (e.g. late 2023) to replay the gate.`;
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#2b3a38] bg-[#111817] p-3">
      <div className="text-xs text-[#9cbab5]">
        <span className="font-semibold text-[#c3ced0]">Requires: </span>
        {feature.requirement}
      </div>
      {measured ? (
        <div className="text-xs text-[#9cbab5]">
          <span className="font-semibold text-[#c3ced0]">This day: </span>
          {measured}
        </div>
      ) : (
        feature.unblock && (
          <div className="text-xs text-[#7f9d98]">
            <span className="font-semibold text-[#c3ced0]">Blocked by: </span>
            {feature.unblock}
          </div>
        )
      )}

      {/* The card names the exact day this feature last worked — one click
          jumps the whole page there. */}
      {lastLiveDay && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[#0cf2d0]/20 bg-[#0cf2d0]/5 px-2.5 py-2">
          <span className="text-xs text-[#9cbab5]">
            Last day with data:{" "}
            <span className="font-bold text-[#0cf2d0]">{lastLiveDay}</span>
          </span>
          {onJump && (
            <button
              onClick={() => onJump(lastLiveDay)}
              className="rounded-md bg-[#0cf2d0] px-2.5 py-1 text-xs font-bold text-[#111817] transition hover:bg-[#0ad4b8]"
            >
              View that day
            </button>
          )}
        </div>
      )}
      {feature.id === "F2" && (
        <div className="text-xs text-[#7f9d98]">
          No day has data yet — this one needs tagged strength sessions, which
          have never existed.
        </div>
      )}
    </div>
  );
}

function RecoveryCostBody({ result }: { result: RecoveryCostResult }) {
  const reported = result.buckets.filter((bucket) => !bucket.insufficient);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[#7f9d98]">
              <th className="pb-2 font-semibold">Session</th>
              <th className="pb-2 text-right font-semibold">HRV Δ</th>
              <th className="pb-2 text-right font-semibold">Resting HR Δ</th>
              <th className="pb-2 text-right font-semibold">n</th>
            </tr>
          </thead>
          <tbody>
            {result.buckets.map((bucket) => (
              <tr key={bucket.sessionType} className="border-t border-[#283937]">
                <td className="py-2 text-[#d6e6e3]">{bucket.label}</td>
                <td className="py-2 text-right">
                  {bucket.hrvDelta === null ? (
                    <span className="text-[#7f9d98]">insufficient data</span>
                  ) : (
                    <span
                      style={{ color: bucket.hrvDelta < 0 ? NEGATIVE : POSITIVE }}
                    >
                      {signed(bucket.hrvDelta)} ms
                    </span>
                  )}
                </td>
                <td className="py-2 text-right text-[#d6e6e3]">
                  {bucket.restingHrDelta === null
                    ? "—"
                    : `${signed(bucket.restingHrDelta)} bpm`}
                </td>
                <td className="py-2 text-right text-[#7f9d98]">{bucket.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7f9d98]">
        Change on the night after a session, against your own 30-day baseline.
        {reported.length >= 2 && result.bucketsSeparate === false && (
          <>
            {" "}
            <span className="text-[#e8c468]">
              These session types don&apos;t separate — the split may not be
              telling you anything a single &quot;training day&quot; number
              wouldn&apos;t.
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function LatencyBody({ result }: { result: RecoveryLatencyResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="After training"
          value={result.afterTraining.medianHours?.toFixed(2) ?? "—"}
          unit="h"
          n={result.afterTraining.n}
        />
        <Stat
          label="After rest"
          value={result.afterRest.medianHours?.toFixed(2) ?? "—"}
          unit="h"
          n={result.afterRest.n}
        />
        <Stat
          label="Extra after training"
          value={
            result.differenceHours === null
              ? "—"
              : `${Math.round(result.differenceHours * 60)}`
          }
          unit="min"
          tone={
            result.differenceHours !== null && result.differenceHours > 0
              ? "bad"
              : "neutral"
          }
        />
      </div>
      <p className="text-xs text-[#7f9d98]">
        Hours into sleep before HRV holds at your baseline for two consecutive
        5-minute samples. Nights that never reach baseline are excluded rather
        than scored as zero.
      </p>
    </div>
  );
}

function RestDayBody({ result }: { result: RestDayAuditResult }) {
  const separation =
    result.nextNightHrvAfterRestful !== null &&
    result.nextNightHrvAfterStressful !== null
      ? result.nextNightHrvAfterRestful - result.nextNightHrvAfterStressful
      : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="After a calm rest day"
          value={
            result.nextNightHrvAfterRestful === null
              ? "—"
              : signed(result.nextNightHrvAfterRestful)
          }
          unit="ms"
          n={result.n.restful}
          tone="good"
        />
        <Stat
          label="After a stressful one"
          value={
            result.nextNightHrvAfterStressful === null
              ? "—"
              : signed(result.nextNightHrvAfterStressful)
          }
          unit="ms"
          n={result.n.stressful}
          tone="bad"
        />
        <Stat
          label="Separation"
          value={separation === null ? "—" : separation.toFixed(1)}
          unit="ms"
        />
      </div>
      <p className="text-xs text-[#7f9d98]">
        Rest days split at your own median daytime stress ({result.medianStressHigh?.toFixed(1) ?? "—"} h
        high-stress), compared by next-night HRV against baseline.
      </p>
    </div>
  );
}

function DriftBody({ result }: { result: DisciplineDriftResult }) {
  const ratios = result.windows.map((window) => window.ratio ?? 0);
  const max = Math.max(...ratios, 0.001);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Current balance"
          value={result.currentRatio === null ? "—" : result.currentRatio.toFixed(2)}
          unit=": 1"
          tone={result.drifting ? "bad" : "good"}
        />
        <Stat
          label="Your usual"
          value={result.medianRatio === null ? "—" : result.medianRatio.toFixed(2)}
          unit=": 1"
        />
        <Stat
          label="Since last strength"
          value={result.weeksSinceStrength?.toFixed(1) ?? "—"}
          unit="wk"
          tone={
            result.weeksSinceStrength !== null && result.weeksSinceStrength >= 3
              ? "bad"
              : "neutral"
          }
        />
      </div>

      {/* Rolling 4-week strength:ride ratio, oldest to newest. */}
      <div className="flex h-12 items-end gap-[2px]">
        {result.windows.map((window) => (
          <div
            key={window.weekStart}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${Math.max(2, ((window.ratio ?? 0) / max) * 100)}%`,
              background: (window.ratio ?? 0) === 0 ? "#3b5450" : POSITIVE,
              opacity: (window.ratio ?? 0) === 0 ? 0.5 : 0.85,
            }}
            title={`${window.weekStart}: ${window.strengthMinutes} min strength / ${window.rideMinutes} min riding`}
          />
        ))}
      </div>

      <p className="text-xs text-[#7f9d98]">
        Strength minutes per riding minute, rolling 4-week window over the last
        six months.{" "}
        {result.drifting && (
          <span style={{ color: NEGATIVE }}>
            Strength work has dropped well below your norm.
          </span>
        )}
      </p>
    </div>
  );
}

function LoadSplitBody({ result }: { result: LoadSplitAggregate }) {
  const share = result.medianDescentShare;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Rides analysed"
          value={result.ridesAnalyzed.toLocaleString()}
        />
        <Stat
          label="Typical descent share"
          value={share === null ? "—" : `${Math.round(share * 100)}`}
          unit="%"
        />
      </div>

      {result.byType.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[#7f9d98]">
              <th className="pb-2 font-semibold">Activity type</th>
              <th className="pb-2 text-right font-semibold">Descent load</th>
              <th className="pb-2 text-right font-semibold">n</th>
            </tr>
          </thead>
          <tbody>
            {result.byType.map((entry) => (
              <tr key={entry.type} className="border-t border-[#283937]">
                <td className="py-2 text-[#d6e6e3]">{entry.type}</td>
                <td className="py-2 text-right text-[#d6e6e3]">
                  {Math.round(entry.medianDescentShare * 100)}%
                </td>
                <td className="py-2 text-right text-[#7f9d98]">{entry.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-xs text-[#7f9d98]">
        Share of each ride&apos;s load that comes from descending rather than
        climbing. Descent load is a steepness-weighted index, not a measured
        force — useful for comparing your own rides, not across athletes.
      </p>
    </div>
  );
}

function RepeatabilityBody({ result }: { result: ClimbRepeatabilityResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Typical decay"
          value={
            result.medianVamDecay === null
              ? "—"
              : `${result.medianVamDecay.toFixed(0)}`
          }
          unit="%"
          n={result.n}
          tone={
            result.medianVamDecay !== null && result.medianVamDecay > 15
              ? "bad"
              : "neutral"
          }
        />
        <Stat
          label="Best ride"
          value={result.bestDecay === null ? "—" : `${result.bestDecay.toFixed(0)}`}
          unit="%"
          tone="good"
        />
        <Stat
          label="Worst ride"
          value={result.worstDecay === null ? "—" : `${result.worstDecay.toFixed(0)}`}
          unit="%"
          tone="bad"
        />
      </div>
      <p className="text-xs text-[#7f9d98]">
        Drop in climbing speed (VAM) from the first climb of a ride to the
        last, on climbs of similar gradient. Lower is better; negative means
        you finished faster than you started.
      </p>
    </div>
  );
}

function DurabilityBody({ result }: { result: DurabilityResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Cardiac drift"
          value={
            result.medianDriftPercent === null
              ? "—"
              : `${result.medianDriftPercent > 0 ? "+" : ""}${result.medianDriftPercent.toFixed(1)}`
          }
          unit="%"
          n={result.n}
          tone={
            result.medianDriftPercent !== null && result.medianDriftPercent > 5
              ? "bad"
              : "good"
          }
        />
      </div>
      <p className="text-xs text-[#7f9d98]">
        In rides over an hour: how much more heart rate the same climbing work
        costs late in the ride vs early (HR per VAM, last third vs first).
        A proxy from climb segments, not full HR-speed decoupling.
      </p>
    </div>
  );
}

function GripChainBody({ result }: { result: GripChainResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="7-day grip load"
          value={
            result.current7DayPercentile === null
              ? "—"
              : `${result.current7DayPercentile}`
          }
          unit="th %ile"
          tone={
            result.current7DayPercentile !== null &&
            result.current7DayPercentile >= 75
              ? "bad"
              : "good"
          }
        />
        <Stat
          label="Stacked pairs, 90d"
          value={String(result.flaggedPairsLast90)}
          tone={result.flaggedPairsLast90 > 4 ? "bad" : "neutral"}
        />
      </div>
      {result.recentStackedPairs.length > 0 && (
        <div className="text-xs text-[#9cbab5]">
          Recent stacks (heavy descent day + strength within 48 h):{" "}
          {result.recentStackedPairs
            .map((pair) => `${pair.descentDay} × ${pair.strengthDay}`)
            .join(" · ")}
        </div>
      )}
      <p className="text-xs text-[#7f9d98]">
        Descending and pulling load the same grip/forearm/shoulder chain.
        Thresholds are your own top-quartile days, not fixed numbers.
      </p>
    </div>
  );
}

function SkillBody({ result }: { result: DescentSkillResult }) {
  const unreliable = result.reliability !== null && !result.reliability.ok;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Braking change"
          value={
            result.medianBrakingChange === null
              ? "—"
              : `${result.medianBrakingChange.toFixed(0)}`
          }
          unit="%"
          n={result.scoredRuns}
          tone={
            result.medianBrakingChange !== null && result.medianBrakingChange < 0
              ? "good"
              : "neutral"
          }
        />
        <Stat
          label="Time change"
          value={
            result.medianTimeChange === null
              ? "—"
              : `${result.medianTimeChange.toFixed(0)}`
          }
          unit="%"
          tone={
            result.medianTimeChange !== null && result.medianTimeChange < 0
              ? "good"
              : "neutral"
          }
        />
        <Stat label="Repeated trails" value={String(result.trails)} />
      </div>

      {unreliable && (
        <div className="rounded-lg border border-[#e8c468]/30 bg-[#e8c468]/10 p-3 text-xs text-[#e8c468]">
          Run-to-run consistency is low (ρ ={" "}
          {result.reliability!.rho.toFixed(2)} across {result.reliability!.n}{" "}
          consecutive-run pairs; the bar is 0.50). Braking varies a lot between
          runs of the same trail — read the trend as directional, not precise.
        </div>
      )}

      <p className="text-xs text-[#7f9d98]">
        Change in braking events per km between early and late runs of the same
        trail, medianed across trails. Negative = smoother.
      </p>
    </div>
  );
}

function ArousalBody({ result }: { result: ArousalResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Early runs"
          value={result.earlyArousal === null ? "—" : result.earlyArousal.toFixed(0)}
          unit="bpm over baseline"
        />
        <Stat
          label="Recent runs"
          value={result.lateArousal === null ? "—" : result.lateArousal.toFixed(0)}
          unit="bpm over baseline"
        />
        <Stat
          label="Change"
          value={
            result.changeBpm === null
              ? "—"
              : `${result.changeBpm > 0 ? "+" : ""}${result.changeBpm.toFixed(1)}`
          }
          unit="bpm"
          n={result.runsWithHr}
          tone={
            result.changeBpm !== null && result.changeBpm < 0 ? "good" : "neutral"
          }
        />
      </div>
      <p className="text-xs text-[#7f9d98]">
        Heart rate on descents sits above your ride baseline mostly from
        arousal, not work. Falling numbers across repeats of the same trail are
        confidence you can see.
      </p>
    </div>
  );
}

function ProgressionBody({ result }: { result: ProgressionResult }) {
  const entries: { label: string; key: keyof ProgressionResult["counts"]; color: string }[] = [
    { label: "Skill", key: "skill", color: "#0cf2d0" },
    { label: "Skill + fitness", key: "both", color: "#38bdf8" },
    { label: "Fitness", key: "fitness", color: "#a78bfa" },
    { label: "Flat", key: "flat", color: "#7f9d98" },
    { label: "Regressing", key: "regressing", color: "#f97362" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {entries.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-sm text-[#d6e6e3]">
              {entry.label}:{" "}
              <span className="font-bold text-white">
                {result.counts[entry.key]}
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#7f9d98]">
        Each repeated trail classified by its early-vs-late runs: lower time at
        the same heart rate is skill; the same time at lower heart rate is
        fitness. {result.trails.length} trails had enough clean repeats.
      </p>
    </div>
  );
}

function SleepDebtBody({ result }: { result: SleepDebtResult }) {
  const inconclusive =
    result.correlation === null || result.correlation.inconclusive;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6">
        <Stat
          label="Weekends with data"
          value={String(result.qualifyingWeekends)}
          n={result.weekends}
        />
        <Stat
          label="Debt ↔ braking"
          value={
            result.correlation === null ? "—" : result.correlation.rho.toFixed(2)
          }
          unit="ρ"
          tone="neutral"
        />
      </div>

      {inconclusive ? (
        <div className="rounded-lg border border-[#2b3a38] bg-[#111817] p-3 text-xs text-[#9cbab5]">
          No detectable relationship between weekday sleep debt and weekend
          descending yet
          {result.correlation
            ? ` (ρ = ${result.correlation.rho.toFixed(2)}, CI includes zero, n = ${result.correlation.n})`
            : ""}
          . That is a finding, not a failure — it will re-test itself as more
          weekends accumulate.
        </div>
      ) : (
        <p className="text-xs text-[#7f9d98]">
          Positive ρ means high-debt weeks precede rougher descending.
        </p>
      )}
    </div>
  );
}

const SERIES_COLORS = ["#0cf2d0", "#38bdf8", "#a78bfa"];

const VERDICT_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  green: { label: "Green — send it", bg: "#0cf2d0", fg: "#111817" },
  clear: { label: "Clear", bg: "#0cf2d0", fg: "#111817" },
  caution: { label: "Caution", bg: "#e8c468", fg: "#111817" },
  "illness-watch": { label: "Illness watch", bg: "#e8c468", fg: "#111817" },
  "overreach-watch": { label: "Overreach watch", bg: "#e8c468", fg: "#111817" },
  red: { label: "Red — back off", bg: "#f97362", fg: "#111817" },
  "no-data": { label: "No ring data this day", bg: "#3b5450", fg: "#d6e6e3" },
};

function VerdictPill({ verdict }: { verdict: string }) {
  const style = VERDICT_STYLE[verdict] ?? VERDICT_STYLE["no-data"];
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
      style={{ background: style.bg, color: style.fg }}
    >
      {style.label}
    </span>
  );
}

function SendDayBody({ result }: { result: SendDayResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictPill verdict={result.verdict} />
        <span className="text-xs text-[#9cbab5]">
          {result.day}
          {result.rideThatDay
            ? ` · ${result.rideThatDay}${result.technicalDay ? " (technical)" : ""}`
            : " · no ride logged this day"}
        </span>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {result.signals.map((signal) => (
            <tr key={signal.key} className="border-t border-[#283937]">
              <td className="py-1.5 text-[#d6e6e3]">{signal.label}</td>
              <td className="py-1.5 text-right text-[#d6e6e3]">
                {signal.value === null ? "—" : signal.value.toFixed(signal.key === "sleep" ? 1 : signal.key === "temperature" ? 2 : 0)}
              </td>
              <td className="py-1.5 pl-3 text-right text-xs text-[#7f9d98]">
                {signal.threshold}
              </td>
              <td className="py-1.5 pl-2 text-right">
                {signal.triggered === null ? (
                  <span className="text-[#7f9d98]">—</span>
                ) : signal.triggered ? (
                  <span style={{ color: "#f97362" }}>▲</span>
                ) : (
                  <span style={{ color: "#0cf2d0" }}>✓</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-[#7f9d98]">
        Two triggered signals = red. Personal thresholds from {result.priorReadings}{" "}
        prior nights; gate could score {result.rideDayCoverage.scored} of{" "}
        {result.rideDayCoverage.rideDays} ride days in the trailing 90.
      </p>
    </div>
  );
}

function IllnessBody({ result }: { result: IllnessResult }) {
  const rows = [
    {
      label: "Temperature deviation",
      value: result.tempDeviation === null ? "—" : `${result.tempDeviation.toFixed(2)} °C`,
      threshold: "> +0.40 °C",
      hot: result.tempDeviation !== null && result.tempDeviation > 0.4,
    },
    {
      label: "Resting heart rate",
      value: result.restingHr === null ? "—" : `${result.restingHr} bpm`,
      threshold:
        result.restingHrThreshold === null
          ? "needs baseline"
          : `> ${result.restingHrThreshold.toFixed(1)} bpm`,
      hot:
        result.restingHr !== null &&
        result.restingHrThreshold !== null &&
        result.restingHr > result.restingHrThreshold,
    },
    {
      label: "Acute : chronic load",
      value:
        result.acuteChronicRatio === null
          ? "—"
          : result.acuteChronicRatio.toFixed(2),
      threshold: "> 1.30",
      hot: result.acuteChronicRatio !== null && result.acuteChronicRatio > 1.3,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictPill verdict={result.verdict} />
        <span className="text-xs text-[#9cbab5]">
          {result.day} · ring worn {result.wear60.nights}/{result.wear60.of} of
          the prior 60 nights
        </span>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-[#283937]">
              <td className="py-1.5 text-[#d6e6e3]">{row.label}</td>
              <td className="py-1.5 text-right text-[#d6e6e3]">{row.value}</td>
              <td className="py-1.5 pl-3 text-right text-xs text-[#7f9d98]">
                {row.threshold}
              </td>
              <td className="py-1.5 pl-2 text-right">
                {row.hot ? (
                  <span style={{ color: "#f97362" }}>▲</span>
                ) : (
                  <span style={{ color: "#0cf2d0" }}>✓</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-[#7f9d98]">
        Body signals without a load spike lean illness; a load spike with one
        body signal leans overreach. All three together is red either way.
      </p>
    </div>
  );
}

function TrendChart({ history }: { history: FeatureHistoryPayload }) {
  const width = 320;
  const height = 96;
  const pad = { top: 8, bottom: 18, left: 6, right: 6 };

  const finite = history.series.flatMap((series) =>
    history.points
      .map((point) => point.values[series.key])
      .filter((value): value is number => value !== null && isFinite(value))
  );

  if (finite.length < 2 || history.points.length < 2) {
    return (
      <p className="text-xs text-[#7f9d98]">
        Not enough windows with data to draw a trend yet.
      </p>
    );
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min || 1;
  const x = (index: number) =>
    pad.left + (index / (history.points.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) =>
    height - pad.bottom - ((value - min) / range) * (height - pad.top - pad.bottom);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Metric history"
      >
        {history.series.map((series, seriesIndex) => {
          // Break the line wherever a window had too little data — gaps stay
          // visible instead of being interpolated away.
          const segments: string[] = [];
          let current: string[] = [];
          history.points.forEach((point, index) => {
            const value = point.values[series.key];
            if (value === null || !isFinite(value)) {
              if (current.length > 1) segments.push(current.join(" "));
              current = [];
            } else {
              current.push(`${x(index)},${y(value)}`);
            }
          });
          if (current.length > 1) segments.push(current.join(" "));

          const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
          return (
            <g key={series.key}>
              {segments.map((points, segIndex) => (
                <polyline
                  key={segIndex}
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {history.points.map((point, index) => {
                const value = point.values[series.key];
                if (value === null || !isFinite(value)) return null;
                return (
                  <circle key={index} cx={x(index)} cy={y(value)} r="2.2" fill={color}>
                    <title>{`${point.windowEnd}: ${value.toFixed(1)} ${series.unit} (n=${point.n})`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
        <text x={pad.left} y={height - 4} fontSize="9" fill="#7f9d98">
          {history.points[0].windowEnd}
        </text>
        <text x={width - pad.right} y={height - 4} fontSize="9" fill="#7f9d98" textAnchor="end">
          {history.points[history.points.length - 1].windowEnd}
        </text>
        <text x={width - pad.right} y={pad.top + 2} fontSize="9" fill="#7f9d98" textAnchor="end">
          {max.toFixed(1)}
        </text>
        <text x={width - pad.right} y={height - pad.bottom - 2} fontSize="9" fill="#7f9d98" textAnchor="end">
          {min.toFixed(1)}
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-3">
        {history.series.map((series, index) => (
          <span key={series.key} className="flex items-center gap-1.5 text-[10px] text-[#9cbab5]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            {series.label} ({series.unit})
          </span>
        ))}
      </div>
      {history.note && (
        <p className="mt-1 text-[10px] text-[#7f9d98]">{history.note}</p>
      )}
    </div>
  );
}

/** Lazy per-card trend: fetched the first time the dropdown opens. */
function HistorySection({ featureId }: { featureId: string }) {
  const [history, setHistory] = useState<FeatureHistoryPayload | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const load = () => {
    if (history || state === "loading") return;
    setState("loading");
    fetch(`/api/insights/history?feature=${featureId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error) throw new Error(payload.error);
        setHistory(payload);
        setState("idle");
      })
      .catch(() => setState("error"));
  };

  return (
    <details className="mt-3 rounded-lg border border-[#2b3a38] bg-[#151f1e] px-3 py-2" onToggle={(event) => {
      if ((event.target as HTMLDetailsElement).open) load();
    }}>
      <summary className="cursor-pointer text-xs font-semibold text-[#9cbab5] hover:text-white">
        Trend over time
      </summary>
      <div className="mt-2">
        {state === "loading" && (
          <p className="text-xs text-[#7f9d98]">Computing history…</p>
        )}
        {state === "error" && (
          <p className="text-xs text-red-400">Could not load history.</p>
        )}
        {history && <TrendChart history={history} />}
      </div>
    </details>
  );
}

export default function InsightsLab() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareDate, setCompareDate] = useState("");
  const [compareData, setCompareData] = useState<InsightsResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Recompute every feature as of the chosen day, so each card can show
  // "then vs now" from the same definitions.
  useEffect(() => {
    if (!compareDate) {
      setCompareData(null);
      return;
    }
    let cancelled = false;
    setCompareLoading(true);
    fetch(`/api/insights?as_of=${compareDate}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && !payload.error) setCompareData(payload);
      })
      .catch(() => {})
      .finally(() => !cancelled && setCompareLoading(false));
    return () => {
      cancelled = true;
    };
  }, [compareDate]);

  // Reads only from the database, so this is fast and works offline from the
  // providers. While ride analysis is still catching up (a stream backfill in
  // progress), it re-fetches on a timer — each fetch analyzes another batch —
  // and stops once two consecutive polls see no change.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSignature = "";
    let idlePolls = 0;

    const load = async () => {
      try {
        const response = await fetch("/api/insights");
        const payload = await response.json();
        if (cancelled) return;

        if (payload.error) {
          setError(payload.error);
          return;
        }

        setData(payload);

        const coverage = payload.coverage ?? {};
        const signature = `${coverage.streams}|${coverage.ridesAnalyzed}`;
        idlePolls = signature === lastSignature ? idlePolls + 1 : 0;
        lastSignature = signature;

        const catchingUp = (coverage.pendingSplits ?? 0) > 0;
        if (catchingUp || idlePolls < 2) {
          timer = setTimeout(load, catchingUp ? 20_000 : 45_000);
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="mx-4 rounded-lg border border-red-600/40 bg-red-900/20 p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-4 rounded-lg border border-[#3b5450] bg-[#1e2a28] p-6 text-sm text-[#9cbab5]">
        Loading insights from your database…
      </div>
    );
  }

  const live = data.features.filter((feature) => feature.status === "live").length;

  const renderBody = (feature: FeaturePayload) => {
    if (feature.status !== "live" || !feature.result) {
      return <ParkedBody feature={feature} onJump={setCompareDate} />;
    }
    switch (feature.id) {
      case "F1":
        return <RecoveryCostBody result={feature.result as RecoveryCostResult} />;
      case "F4":
        return <LatencyBody result={feature.result as RecoveryLatencyResult} />;
      case "F6":
        return <RestDayBody result={feature.result as RestDayAuditResult} />;
      case "F3":
        return <SendDayBody result={feature.result as SendDayResult} />;
      case "F5":
        return <IllnessBody result={feature.result as IllnessResult} />;
      case "F7":
        return <SkillBody result={feature.result as DescentSkillResult} />;
      case "F8":
        return <ArousalBody result={feature.result as ArousalResult} />;
      case "F9":
        return <ProgressionBody result={feature.result as ProgressionResult} />;
      case "F15":
        return <SleepDebtBody result={feature.result as SleepDebtResult} />;
      case "F10":
        return (
          <RepeatabilityBody result={feature.result as ClimbRepeatabilityResult} />
        );
      case "F11":
        return <DurabilityBody result={feature.result as DurabilityResult} />;
      case "F12":
        return <LoadSplitBody result={feature.result as LoadSplitAggregate} />;
      case "F13":
        return <GripChainBody result={feature.result as GripChainResult} />;
      case "F14":
        return <DriftBody result={feature.result as DisciplineDriftResult} />;
      default:
        return <ParkedBody feature={feature} onJump={setCompareDate} />;
    }
  };

  return (
    <div className="mx-4 space-y-6">
      <div className="rounded-xl border border-[#3b5450] bg-[#151f1e] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Insights Lab</h2>
            <p className="text-xs text-[#9cbab5]">
              {live} of {data.features.length} metrics have enough data to compute.
              The rest show what they are waiting on.
            </p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Stat label="Activities" value={data.coverage.activities.toLocaleString()} />
            <Stat label="Nights w/ HRV" value={data.coverage.nightsWithHrv.toLocaleString()} />
            <Stat label="Stress days" value={data.coverage.stressDays.toLocaleString()} />
            <Stat
              label="Ride streams"
              value={data.coverage.streams.toLocaleString()}
              tone={data.coverage.streams === 0 ? "bad" : "neutral"}
            />
          </div>
        </div>

        {/* Pick a past day to see every metric as it stood then. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#283937] pt-3">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
            View scores as of a past day
          </span>
          <input
            type="date"
            aria-label="As-of date"
            value={compareDate}
            onChange={(event) => setCompareDate(event.target.value)}
            className="rounded-md border border-[#3b5450] bg-[#0f1817] p-1.5 text-sm text-white"
          />
          {compareDate && (
            <button
              onClick={() => setCompareDate("")}
              className="rounded-md border border-[#3b5450] px-2 py-1 text-xs font-semibold text-[#9cbab5] hover:text-white"
            >
              Clear
            </button>
          )}
          {compareLoading && (
            <span className="text-xs text-[#7f9d98]">recomputing…</span>
          )}
          {compareDate && compareData && !compareLoading && (
            <span className="text-xs text-[#9cbab5]">
              showing every metric as it stood on {compareDate} — Clear returns
              to today
            </span>
          )}
        </div>

        {data.coverage.streams === 0 ? (
          <div className="mt-3 rounded-lg border border-[#e8c468]/30 bg-[#e8c468]/10 p-3 text-xs text-[#e8c468]">
            Several metrics are waiting on per-activity streams. Reconnect
            Strava on the Connect page, then run the streams backfill.
          </div>
        ) : data.coverage.ridesAnalyzed < data.coverage.streams ||
          data.coverage.pendingSplits > 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#0cf2d0]/20 bg-[#0cf2d0]/5 p-3 text-xs text-[#9cbab5]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#0cf2d0]" />
            Analyzing rides: {data.coverage.ridesAnalyzed} of{" "}
            {data.coverage.streams} done — numbers update automatically as the
            rest land.
          </div>
        ) : null}
      </div>

      {FEATURE_GROUPS.map((group) => {
        const features = data.features
          .filter((feature) => feature.group === group.id)
          .sort((a, b) => {
            // Working metrics first; parked ones keep their catalogue order.
            if (a.status === b.status) return 0;
            return a.status === "live" ? -1 : 1;
          });
        if (features.length === 0) return null;

        const liveCount = features.filter(
          (feature) => feature.status === "live"
        ).length;

        return (
          <div key={group.id}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-[#7f9d98]">
              {group.label}
              <span className="ml-2 font-normal normal-case tracking-normal text-[#4d625f]">
                {liveCount}/{features.length} live
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {features.map((feature) => {
                // A picked day replaces the view: the card shows that day's
                // score, computed from only the data that existed by then.
                const asOfFeature = compareData?.features.find(
                  (candidate) => candidate.id === feature.id
                );
                const viewing =
                  compareDate && asOfFeature ? asOfFeature : feature;
                return (
                  <Card key={feature.id} feature={viewing}>
                    {compareDate && (
                      <div className="mb-2 inline-block rounded-full bg-[#38bdf8]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#38bdf8]">
                        as of {compareDate}
                      </div>
                    )}
                    {renderBody(viewing)}
                    {feature.status === "live" && (
                      <HistorySection featureId={feature.id} />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
