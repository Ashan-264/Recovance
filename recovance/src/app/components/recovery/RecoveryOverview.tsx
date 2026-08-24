"use client";

import React, { useMemo } from "react";

/**
 * The at-a-glance layer for the recovery page.
 *
 * One control row (date range + a single refresh), the latest night as stat
 * tiles with deltas against the loaded window and a 14-night sparkline, the
 * night's sleep-stage composition, and a clickable strip of recent nights that
 * drives the detail sections below. Detail sections stay for depth; this layer
 * answers "how am I doing?" without scrolling.
 */

interface NightLike {
  day: string;
  type?: string;
  total_sleep_duration: number; // seconds
  deep_sleep_duration: number;
  rem_sleep_duration: number;
  light_sleep_duration: number;
  awake_time: number;
  efficiency: number;
  average_hrv: number;
  lowest_heart_rate: number;
  readiness?: { score: number } | null;
}

interface RecoveryOverviewProps {
  nights: NightLike[]; // newest first, as the page stores them
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  selectedDay: string;
  onSelectDay: (day: string) => void;
}

const ACCENT = "#0cf2d0";
const DIM = "#4a5a5c";
const RED = "#f97362";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** 12–14 point sparkline in the de-emphasis hue; latest point in the accent. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 3) {
    return null;
  }

  const width = 110;
  const height = 30;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * (width - 6) + 3;
    const y = height - 4 - ((value - min) / range) * (height - 8);
    return [x, y] as const;
  });

  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} className="mt-1" aria-hidden>
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={DIM}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={ACCENT} />
    </svg>
  );
}

function Tile({
  label,
  value,
  unit,
  delta,
  deltaUnit,
  goodWhenHigher,
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  delta: number | null;
  deltaUnit: string;
  goodWhenHigher: boolean;
  spark: number[];
}) {
  const improving = delta !== null && (goodWhenHigher ? delta >= 0 : delta <= 0);
  const deltaColor = delta === null ? DIM : improving ? ACCENT : RED;

  return (
    <div className="min-w-[150px] flex-1 rounded-lg border border-[#3b5450] bg-[#151f1e] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[24px] font-semibold leading-none text-white">
          {value}
        </span>
        {unit && <span className="text-xs text-[#9cbab5]">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: deltaColor }}>
        {delta === null
          ? "no baseline yet"
          : `${delta > 0 ? "+" : ""}${delta.toFixed(Math.abs(delta) < 10 ? 1 : 0)}${deltaUnit} vs period median`}
      </div>
      <Sparkline values={spark} />
    </div>
  );
}

/** The night's composition as one labeled bar — deep, REM, light, awake. */
function StageBar({ night }: { night: NightLike }) {
  const stages = [
    { label: "Deep", seconds: night.deep_sleep_duration, color: "#0cf2d0" },
    { label: "REM", seconds: night.rem_sleep_duration, color: "#38bdf8" },
    { label: "Light", seconds: night.light_sleep_duration, color: "#3b5450" },
    { label: "Awake", seconds: night.awake_time, color: "#f97362" },
  ].filter((stage) => stage.seconds > 0);

  const total = stages.reduce((sum, stage) => sum + stage.seconds, 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {stages.map((stage) => (
          <div
            key={stage.label}
            style={{
              width: `${(stage.seconds / total) * 100}%`,
              background: stage.color,
            }}
            title={`${stage.label}: ${Math.round(stage.seconds / 60)} min`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4">
        {stages.map((stage) => (
          <span key={stage.label} className="flex items-center gap-1.5 text-[11px] text-[#9cbab5]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: stage.color }}
            />
            {stage.label} {Math.round(stage.seconds / 60)}m
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RecoveryOverview({
  nights,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  onRefresh,
  loading,
  selectedDay,
  onSelectDay,
}: RecoveryOverviewProps) {
  // The API returns every sleep period, naps included; the overview wants one
  // night per day — long_sleep preferred, longest otherwise. Without this a
  // 40-minute nap can masquerade as "latest night" and chips get duplicate days.
  const nightly = useMemo(() => {
    const byDay = new Map<string, NightLike>();
    for (const night of nights) {
      const existing = byDay.get(night.day);
      const candidateMain = night.type === "long_sleep";
      const existingMain = existing?.type === "long_sleep";
      if (
        !existing ||
        (candidateMain && !existingMain) ||
        (candidateMain === existingMain &&
          night.total_sleep_duration > existing.total_sleep_duration)
      ) {
        byDay.set(night.day, night);
      }
    }
    return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  }, [nights]);

  const chronological = useMemo(() => [...nightly].reverse(), [nightly]);
  const latest = nightly[0] ?? null;

  const series = useMemo(() => {
    const take = chronological.slice(-14);
    return {
      readiness: take
        .map((night) => night.readiness?.score ?? null)
        .filter((value): value is number => value !== null),
      sleepHours: take.map((night) => night.total_sleep_duration / 3600),
      hrv: take.map((night) => night.average_hrv).filter((value) => value > 0),
      lowestHr: take
        .map((night) => night.lowest_heart_rate)
        .filter((value) => value > 0),
      efficiency: take.map((night) => night.efficiency).filter((value) => value > 0),
    };
  }, [chronological]);

  const medians = useMemo(
    () => ({
      readiness: median(
        chronological
          .map((night) => night.readiness?.score ?? null)
          .filter((value): value is number => value !== null)
      ),
      sleepHours: median(
        chronological.map((night) => night.total_sleep_duration / 3600)
      ),
      hrv: median(
        chronological.map((night) => night.average_hrv).filter((v) => v > 0)
      ),
      lowestHr: median(
        chronological.map((night) => night.lowest_heart_rate).filter((v) => v > 0)
      ),
      efficiency: median(
        chronological.map((night) => night.efficiency).filter((v) => v > 0)
      ),
    }),
    [chronological]
  );

  const chips = nightly.slice(0, 14);

  return (
    <div className="mx-4 mb-6 rounded-xl border border-[#3b5450] bg-[#1e2a28] p-5">
      {/* One control row for the whole page. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Recovery overview</h2>
          <p className="text-xs text-[#9cbab5]">
            {latest
              ? `Latest night: ${latest.day}`
              : "No nights loaded for this range yet"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Start date"
            className="rounded-md border border-[#3b5450] bg-[#151f1e] p-1.5 text-sm text-white"
            value={startDate}
            onChange={(event) => onStartDate(event.target.value)}
          />
          <span className="text-xs text-[#7f9d98]">to</span>
          <input
            type="date"
            aria-label="End date"
            className="rounded-md border border-[#3b5450] bg-[#151f1e] p-1.5 text-sm text-white"
            value={endDate}
            onChange={(event) => onEndDate(event.target.value)}
          />
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] transition hover:bg-[#0ad4b8] disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {latest ? (
        <>
          {/* Latest-night stat tiles. */}
          <div className="mt-4 flex flex-wrap gap-3">
            {latest.readiness?.score !== undefined && (
              <Tile
                label="Readiness"
                value={String(latest.readiness?.score ?? "—")}
                delta={
                  medians.readiness === null || latest.readiness == null
                    ? null
                    : latest.readiness.score - medians.readiness
                }
                deltaUnit=""
                goodWhenHigher
                spark={series.readiness}
              />
            )}
            <Tile
              label="Sleep"
              value={(latest.total_sleep_duration / 3600).toFixed(1)}
              unit="h"
              delta={
                medians.sleepHours === null
                  ? null
                  : latest.total_sleep_duration / 3600 - medians.sleepHours
              }
              deltaUnit="h"
              goodWhenHigher
              spark={series.sleepHours}
            />
            <Tile
              label="HRV"
              value={latest.average_hrv > 0 ? String(latest.average_hrv) : "—"}
              unit="ms"
              delta={
                medians.hrv === null || latest.average_hrv <= 0
                  ? null
                  : latest.average_hrv - medians.hrv
              }
              deltaUnit="ms"
              goodWhenHigher
              spark={series.hrv}
            />
            <Tile
              label="Lowest HR"
              value={
                latest.lowest_heart_rate > 0
                  ? String(latest.lowest_heart_rate)
                  : "—"
              }
              unit="bpm"
              delta={
                medians.lowestHr === null || latest.lowest_heart_rate <= 0
                  ? null
                  : latest.lowest_heart_rate - medians.lowestHr
              }
              deltaUnit="bpm"
              goodWhenHigher={false}
              spark={series.lowestHr}
            />
            <Tile
              label="Efficiency"
              value={latest.efficiency > 0 ? String(latest.efficiency) : "—"}
              unit="%"
              delta={
                medians.efficiency === null || latest.efficiency <= 0
                  ? null
                  : latest.efficiency - medians.efficiency
              }
              deltaUnit="%"
              goodWhenHigher
              spark={series.efficiency}
            />
          </div>

          {/* How the night was spent. */}
          <div className="mt-4">
            <StageBar night={latest} />
          </div>

          {/* Recent nights drive the detail sections below. */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {chips.map((night) => {
              const active = night.day === selectedDay;
              const label = new Date(`${night.day}T00:00:00`).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" }
              );
              return (
                <button
                  key={night.day}
                  onClick={() => onSelectDay(night.day)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-[#0cf2d0] text-[#111817]"
                      : "bg-[#151f1e] text-[#9cbab5] hover:text-white"
                  }`}
                  title={`${(night.total_sleep_duration / 3600).toFixed(1)}h sleep`}
                >
                  {label}
                </button>
              );
            })}
            {chips.length > 0 && (
              <span className="ml-2 self-center text-[10px] text-[#7f9d98]">
                pick a night → details below
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-[#9cbab5]">
          Pick a range and hit Refresh — data loads from your database first,
          then anything missing is fetched from Oura.
        </p>
      )}
    </div>
  );
}
