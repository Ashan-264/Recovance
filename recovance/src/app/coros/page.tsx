"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/app/components/Header";
import ChartLine from "@/app/components/insights/ChartLine";
import { formatDurationHM, formatMinutesHM } from "@/lib/duration";

// Everything the COROS connection exposes, in one place: fitness markers
// (VO2max, lactate threshold, stamina), daily training load and fatigue,
// nightly HRV with the watch's own baseline, sleep, and the activity list.
// Sleep also feeds the Recovery page, where it replaces Oura per night.

interface CorosDaily {
  day: string;
  avgSleepHrv: number | null;
  restingHeartRate: number | null;
  trainingLoad: number | null;
  trainingLoadRatio: number | null;
  ati: number | null;
  cti: number | null;
  tiredRate: number | null;
  performance: number | null;
  distance: number | null;
  duration: number | null;
  vo2max: number | null;
  lthr: number | null;
  ltsp: number | null;
  staminaLevel: number | null;
  staminaLevel7d: number | null;
}

interface CorosHrv {
  baseline: number | null;
  standardDeviation: number | null;
  nights: { day: string; avgSleepHrv: number | null }[];
}

interface CorosActivity {
  id: string;
  name: string | null;
  sportName: string | null;
  startTime: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  calories: number | null;
  trainingLoad: number | null;
  avgPower: number | null;
  elevationGain: number | null;
}

interface CorosSleepNight {
  day: string;
  totalMinutes: number | null;
  deepMinutes: number | null;
  lightMinutes: number | null;
  remMinutes: number | null;
  awakeMinutes: number | null;
  avgHeartRate: number | null;
  minHeartRate: number | null;
  score: number | null;
}

interface Summary {
  daily: CorosDaily[];
  hrv: CorosHrv;
  activities: CorosActivity[];
  sleep: CorosSleepNight[];
}

/** Seconds per km → "4:32 /km". */
function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Latest day in the range that has a value for this field. */
function latestValue(
  daily: CorosDaily[],
  pick: (d: CorosDaily) => number | null
): number | null {
  for (let i = daily.length - 1; i >= 0; i--) {
    const value = pick(daily[i]);
    if (value != null && value > 0) return value;
  }
  return null;
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-[140px] flex-1 rounded-lg border border-[#3b5450] bg-[#151f1e] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none text-white">{value}</span>
        {unit && <span className="text-xs text-[#9cbab5]">{unit}</span>}
      </div>
    </div>
  );
}

export default function CorosPage() {
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotConnected(false);
    try {
      const res = await fetch("/api/coros/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data);
      } else if (res.status === 503) {
        setNotConnected(true);
      } else {
        setError(data.error || "Failed to load COROS data");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load COROS data");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const daily = summary?.daily ?? [];
  const sleepByDay = new Map((summary?.sleep ?? []).map((n) => [n.day, n]));
  const loadDays = daily.filter((d) => (d.trainingLoad ?? 0) > 0);
  const hrvDays = daily.filter((d) => (d.avgSleepHrv ?? 0) > 0);
  const tableDays = [...daily]
    .filter(
      (d) =>
        (d.trainingLoad ?? 0) > 0 ||
        (d.avgSleepHrv ?? 0) > 0 ||
        (d.restingHeartRate ?? 0) > 0 ||
        sleepByDay.has(d.day)
    )
    .sort((a, b) => b.day.localeCompare(a.day));

  const vo2max = latestValue(daily, (d) => d.vo2max);
  const stamina = latestValue(daily, (d) => d.staminaLevel7d ?? d.staminaLevel);
  const lthr = latestValue(daily, (d) => d.lthr);
  const ltsp = latestValue(daily, (d) => d.ltsp);
  const ati = latestValue(daily, (d) => d.ati);
  const cti = latestValue(daily, (d) => d.cti);
  const fatigue = latestValue(daily, (d) => d.tiredRate);

  return (
    <div className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden">
      <Header />
      <div className="flex h-full flex-1 justify-center">
        <main className="flex flex-1 flex-col max-w-[960px] px-4 py-6 text-white">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
            <div>
              <h1 className="text-[28px] font-bold leading-tight">COROS</h1>
              <p className="text-xs text-[#9cbab5]">
                Training load, fitness markers, HRV, sleep, and activities from
                your COROS watch. Sleep metrics also replace Oura on the
                Recovery page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Start date"
                className="rounded-md border border-[#3b5450] bg-[#151f1e] p-1.5 text-sm text-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-xs text-[#7f9d98]">to</span>
              <input
                type="date"
                aria-label="End date"
                className="rounded-md border border-[#3b5450] bg-[#151f1e] p-1.5 text-sm text-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button
                onClick={load}
                disabled={loading}
                className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {notConnected && (
            <div className="rounded-lg border border-yellow-600/40 bg-yellow-900/20 p-4 text-sm text-yellow-400">
              No COROS connection.{" "}
              <a href="/connect" className="font-bold underline">
                Connect COROS
              </a>{" "}
              with your account credentials to load this data.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-600/40 bg-red-900/20 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {summary && (
            <>
              {/* Fitness + condition markers (latest values in range) */}
              <div className="flex flex-wrap gap-3">
                <Tile label="VO2max" value={vo2max != null ? String(vo2max) : "—"} />
                <Tile label="Stamina (7d)" value={stamina != null ? String(stamina) : "—"} unit="%" />
                <Tile label="Threshold HR" value={lthr != null ? String(lthr) : "—"} unit="bpm" />
                <Tile label="Threshold Pace" value={ltsp != null ? formatPace(ltsp) : "—"} />
                <Tile
                  label="HRV Baseline"
                  value={
                    summary.hrv.baseline != null
                      ? `${summary.hrv.baseline}${
                          summary.hrv.standardDeviation != null
                            ? ` ±${summary.hrv.standardDeviation}`
                            : ""
                        }`
                      : "—"
                  }
                  unit="ms"
                />
                <Tile
                  label="Load ATI / CTI"
                  value={ati != null || cti != null ? `${ati ?? "—"} / ${cti ?? "—"}` : "—"}
                />
                <Tile label="Fatigue" value={fatigue != null ? String(fatigue) : "—"} />
              </div>

              {/* Trends */}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[#3b5450] bg-[#1e2a28] p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">
                    Training load per day
                  </h3>
                  {loadDays.length > 0 ? (
                    <ChartLine
                      labels={loadDays.map((d) => formatDay(d.day))}
                      values={loadDays.map((d) => d.trainingLoad ?? 0)}
                      color="#0cf2d0"
                      label="Load"
                    />
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-400">No data</p>
                  )}
                </div>
                <div className="rounded-lg border border-[#3b5450] bg-[#1e2a28] p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">
                    Sleep HRV per night
                    {summary.hrv.baseline != null &&
                      ` (baseline ${summary.hrv.baseline} ms)`}
                  </h3>
                  {hrvDays.length > 0 ? (
                    <ChartLine
                      labels={hrvDays.map((d) => formatDay(d.day))}
                      values={hrvDays.map((d) => d.avgSleepHrv ?? 0)}
                      color="#38bdf8"
                      label="HRV (ms)"
                    />
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-400">No data</p>
                  )}
                </div>
              </div>

              {/* Daily metrics */}
              <div className="mt-4 rounded-lg border border-[#3b5450] bg-[#1e2a28] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Daily metrics</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-gray-200">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Load</th>
                        <th className="px-3 py-2">Load Ratio</th>
                        <th className="px-3 py-2">Fatigue</th>
                        <th className="px-3 py-2">Performance</th>
                        <th className="px-3 py-2">HRV (ms)</th>
                        <th className="px-3 py-2">RHR (bpm)</th>
                        <th className="px-3 py-2">Sleep</th>
                        <th className="px-3 py-2">Sleep Score</th>
                        <th className="px-3 py-2">Distance</th>
                        <th className="px-3 py-2">Active Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableDays.map((d, i) => {
                        const night = sleepByDay.get(d.day);
                        return (
                          <tr
                            key={d.day}
                            className={i % 2 === 0 ? "bg-[#1a2423]" : "bg-[#16201f]"}
                          >
                            <td className="whitespace-nowrap px-3 py-2 text-white">{d.day}</td>
                            <td className="px-3 py-2">{d.trainingLoad ?? "—"}</td>
                            <td className="px-3 py-2">
                              {d.trainingLoadRatio != null
                                ? d.trainingLoadRatio.toFixed(2)
                                : "—"}
                            </td>
                            <td className="px-3 py-2">{d.tiredRate ?? "—"}</td>
                            <td className="px-3 py-2">{d.performance ?? "—"}</td>
                            <td className="px-3 py-2">{d.avgSleepHrv ?? "—"}</td>
                            <td className="px-3 py-2">{d.restingHeartRate ?? "—"}</td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {night?.totalMinutes
                                ? formatMinutesHM(night.totalMinutes)
                                : "—"}
                            </td>
                            <td className="px-3 py-2">{night?.score ?? "—"}</td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {d.distance
                                ? `${(d.distance / 1000).toFixed(1)} km`
                                : "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {d.duration ? formatDurationHM(d.duration) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {tableDays.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-3 py-4 text-center text-gray-400">
                            No daily metrics in this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activities */}
              <div className="mt-4 rounded-lg border border-[#3b5450] bg-[#1e2a28] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Activities ({summary.activities.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-gray-200">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Activity</th>
                        <th className="px-3 py-2">Sport</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Distance</th>
                        <th className="px-3 py-2">Avg HR</th>
                        <th className="px-3 py-2">Max HR</th>
                        <th className="px-3 py-2">Power</th>
                        <th className="px-3 py-2">Load</th>
                        <th className="px-3 py-2">Calories</th>
                        <th className="px-3 py-2">Elev</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.activities.map((a, i) => (
                        <tr
                          key={a.id + i}
                          className={i % 2 === 0 ? "bg-[#1a2423]" : "bg-[#16201f]"}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-white">
                            {a.startTime
                              ? new Date(a.startTime * 1000).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{a.name ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{a.sportName ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {a.durationSeconds ? formatDurationHM(a.durationSeconds) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {a.distanceMeters
                              ? `${(a.distanceMeters / 1000).toFixed(1)} km`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">{a.avgHr ?? "—"}</td>
                          <td className="px-3 py-2">{a.maxHr ?? "—"}</td>
                          <td className="px-3 py-2">{a.avgPower ? `${a.avgPower} W` : "—"}</td>
                          <td className="px-3 py-2">{a.trainingLoad ?? "—"}</td>
                          <td className="px-3 py-2">{a.calories ? `${a.calories} kcal` : "—"}</td>
                          <td className="px-3 py-2">
                            {a.elevationGain != null ? `${a.elevationGain} m` : "—"}
                          </td>
                        </tr>
                      ))}
                      {summary.activities.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-3 py-4 text-center text-gray-400">
                            No activities in this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
