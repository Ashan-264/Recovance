"use client";
// pages/recovery.tsx
import Head from "next/head";
import Header from "@/app/components/Header";
import { RecoveryHeader } from "@/app/components/recovery";
import { useState } from "react";

// Define types for better type safety
interface SleepDataItem {
  id: string;
  day: string;
  average_breath: number;
  average_heart_rate: number;
  average_hrv: number;
  awake_time: number;
  bedtime_end: string;
  bedtime_start: string;
  deep_sleep_duration: number;
  efficiency: number;
  heart_rate: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  hrv: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  latency: number;
  light_sleep_duration: number;
  low_battery_alert: boolean;
  lowest_heart_rate: number;
  movement_30_sec: string;
  period: number;
  readiness: {
    contributors: {
      activity_balance: number;
      body_temperature: number;
      hrv_balance: number;
      previous_day_activity: number;
      previous_night: number;
      recovery_index: number;
      resting_heart_rate: number;
      sleep_balance: number;
    };
    score: number;
    temperature_deviation: number;
    temperature_trend_deviation: number;
  };
  readiness_score_delta: number;
  rem_sleep_duration: number;
  restless_periods: number;
  sleep_phase_5_min: string;
  sleep_score_delta: number;
  sleep_algorithm_version: string;
  time_in_bed: number;
  total_sleep_duration: number;
  type: string;
}

interface SessionData {
  day: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration: number;
  deep_sleep_duration: number;
  rem_sleep_duration: number;
  average_heart_rate: number;
  average_hrv: number;
  efficiency: number;
  latency: number;
  type: string;
}

interface ReadinessDataItem {
  id: string;
  day: string;
  score: number;
  temperature_deviation: number;
  temperature_trend_deviation: number;
  contributors: Record<string, number>;
}

interface BurnoutScore {
  total_score: number;
  week_start: string;
  week_end: string;
}

interface OuraDailySleepRecord {
  id: string;
  day: string;
  score?: number;
  total_sleep_duration?: number;
  deep_sleep_duration?: number;
  rem_sleep_duration?: number;
  light_sleep_duration?: number;
  awake_time?: number;
  efficiency?: number;
  latency?: number;
  time_in_bed?: number;
  bedtime_start?: string;
  bedtime_end?: string;
}

interface OuraDailyActivityRecord {
  id?: string;
  day?: string;
  date?: string;
  timestamp?: string;
  active_calories?: number;
  active_calories_total?: number;
  cal_active?: number;
  equivalent_walking_distance?: number;
  high?: number;
  inactive?: number;
  inactivity_alerts?: number;
  low?: number;
  medium?: number;
  met_min_high?: number;
  met_min_inactive?: number;
  met_min_low?: number;
  met_min_medium?: number;
}

interface OuraStressRecord {
  id?: string;
  day: string;
  stress_high?: number;
  recovery_high?: number;
  day_summary?: string;
}

interface OuraResilienceRecord {
  id?: string;
  day: string;
  level?: string;
  contributors?: {
    sleep_recovery?: number;
    daytime_recovery?: number;
    stress?: number;
  };
}

interface OuraReadinessRecord {
  id?: string;
  day?: string;
  date?: string;
  timestamp?: string;
  score?: number;
  temperature_deviation?: number;
  temperature_trend_deviation?: number;
  contributors?: Record<string, number>;
}

interface BurnoutSummary {
  average_score: number;
  highest_score: number;
  lowest_score: number;
  total_weeks: number;
}

export default function RecoveryPage() {
  // Default date range: last 3 months to today
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(threeMonthsAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [sleepData, setSleepData] = useState<SleepDataItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [readinessData, setReadinessData] = useState<ReadinessDataItem[]>([]);
  const [selectedReadinessDay, setSelectedReadinessDay] = useState<string>("");

  // Burnout calculation state
  // Strava removed – no access token needed

  const [burnoutScores, setBurnoutScores] = useState<BurnoutScore[]>([]);
  const [burnoutSummary, setBurnoutSummary] = useState<BurnoutSummary | null>(
    null
  );
  const [burnoutLoading, setBurnoutLoading] = useState(false);
  const [burnoutWeights, setBurnoutWeights] = useState({
    hrv: 0.2,
    rhr: 0.15,
    sleep: 0.2,
    subjective: 0.1,
    readiness: 0.1,
    stress: 0.15,
    resilience: 0.1,
  });

  interface DailyMetricDetail {
    value: number;
    score: number;
    source: string;
  }
  interface ResilienceDetail {
    value: string;
    score: number;
    source: string;
  }
  interface WeekDailyRow {
    date: string;
    hrv?: DailyMetricDetail;
    rhr?: DailyMetricDetail;
    calories?: DailyMetricDetail;
    readiness?: DailyMetricDetail;
    sleepScore?: DailyMetricDetail;
    stress?: DailyMetricDetail;
    resilience?: ResilienceDetail;
  }

  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(
    null
  );
  const [weekDailyMetrics, setWeekDailyMetrics] = useState<
    Record<number, WeekDailyRow[]>
  >({});
  const [weekAverages, setWeekAverages] = useState<
    Record<
      number,
      {
        readiness?: number;
        sleepScore?: number;
        calories?: number;
        rhr?: number;
        hrv?: number;
        stress?: number;
        resilience?: number;
      }
    >
  >({});

  const handleToggleWeek = async (weekIndex: number) => {
    if (expandedWeekIndex === weekIndex) {
      setExpandedWeekIndex(null);
      return;
    }
    setExpandedWeekIndex(weekIndex);
    if (!weekDailyMetrics[weekIndex]) {
      await fetchWeekDailyMetrics(weekIndex);
    }
  };

  const fetchWeekDailyMetrics = async (weekIndex: number) => {
    const week = burnoutScores[weekIndex];
    if (!week) return;

    const weekStart = new Date(week.week_start);
    const weekEnd = new Date(week.week_end);

    const rowsMap = new Map<string, WeekDailyRow>();

    try {
      // Fetch Oura sleep data for HRV and RHR
      const sleepRes = await fetch("/api/sleep/sleep_detail_days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: week.week_start,
          end_date: week.week_end,
        }),
      });

      if (sleepRes.ok) {
        const data = await sleepRes.json();
        console.log("Sleep data response:", data);
        const sleepRecords: SleepDataItem[] = data.data || [];
        console.log("Sleep records:", sleepRecords);
        const dailyMap = new Map<string, SleepDataItem>();
        sleepRecords.forEach((record: SleepDataItem) => {
          dailyMap.set(record.day, record);
        });

        for (
          let d = new Date(weekStart);
          d <= weekEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const date = d.toISOString().split("T")[0];
          const record = dailyMap.get(date);
          if (!record) continue;
          console.log(`Processing sleep record for ${date}:`, record);
          console.log(`Sleep record score field:`, record.readiness?.score);

          // HRV
          if (record.average_hrv && record.average_hrv > 0) {
            const hrvValue = record.average_hrv;
            const hrvScore = Math.max(0, (100 - hrvValue) / 100);
            const row = rowsMap.get(date) || { date };
            row.hrv = {
              value: hrvValue,
              score: hrvScore,
              source: `Oura sleep_detail_days id: ${record.id}`,
            };
            rowsMap.set(date, row);
          }

          // Resting HR
          if (record.average_heart_rate && record.average_heart_rate > 0) {
            const rhrValue = record.average_heart_rate;
            const rhrScore = Math.min(1, (rhrValue - 50) / 20);
            const row = rowsMap.get(date) || { date };
            row.rhr = {
              value: rhrValue,
              score: rhrScore > 0 ? rhrScore : 0,
              source: `Oura sleep_detail_days id: ${record.id}`,
            };
            rowsMap.set(date, row);
          }

          // Sleep Score is fetched separately from daily_sleep endpoint below
        }
      }

      // Fetch Oura daily sleep data for sleep scores (separate from session data)
      const dailySleepRes = await fetch("/api/sleep/oura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: week.week_start,
          end_date: week.week_end,
        }),
      });
      if (dailySleepRes.ok) {
        const data = await dailySleepRes.json();
        console.log("Daily sleep data response:", data);
        const dailySleepRecords = data.data || [];
        console.log("Daily sleep records:", dailySleepRecords);

        dailySleepRecords.forEach((record: OuraDailySleepRecord) => {
          const date = record.day;
          if (
            record.score &&
            typeof record.score === "number" &&
            record.score > 0
          ) {
            const sleepScoreValue = record.score;
            const sleepRisk = Math.max(0, (100 - sleepScoreValue) / 100);
            const row: WeekDailyRow = rowsMap.get(date) || { date };
            row.sleepScore = {
              value: sleepScoreValue,
              score: sleepRisk,
              source: `Oura daily_sleep score: ${sleepScoreValue}`,
            };
            rowsMap.set(date, row);
            console.log(`Added sleep score for ${date}: ${sleepScoreValue}`);
          }
        });
      }

      // Fetch Oura daily activity for active calories
      const activityRes = await fetch("/api/oura/daily_activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: week.week_start,
          end_date: week.week_end,
        }),
      });
      if (activityRes.ok) {
        const data = await activityRes.json();
        const dailyMap = new Map<string, OuraDailyActivityRecord>();
        (data.data || []).forEach((rec: OuraDailyActivityRecord) => {
          const day =
            rec.day ||
            rec.date ||
            (rec.timestamp ? String(rec.timestamp).split("T")[0] : undefined);
          if (day) dailyMap.set(day, rec);
        });
        for (
          let d = new Date(weekStart);
          d <= weekEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const date = d.toISOString().split("T")[0];
          const rec = dailyMap.get(date);
          const active =
            rec?.active_calories ??
            rec?.active_calories_total ??
            rec?.cal_active;
          if (typeof active === "number" && active > 0) {
            const value = active;
            const dailyHighCalories = 1000;
            const score = Math.min(value / dailyHighCalories, 1.0);
            const row = rowsMap.get(date) || { date };
            row.calories = { value, score, source: "Oura daily_activity" };
            rowsMap.set(date, row);
          }
        }
      }

      // Fetch Oura stress data
      const stressRes = await fetch("/api/oura/daily_stress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: week.week_start,
          end_date: week.week_end,
        }),
      });
      if (stressRes.ok) {
        const data = await stressRes.json();
        console.log("Stress data response:", data);
        console.log("Sample stress record:", data.data?.[0]);
        (data.data || []).forEach((rec: OuraStressRecord) => {
          const date = rec.day;
          console.log(`Stress record for ${date}:`, rec);
          if (rec.stress_high && typeof rec.stress_high === "number") {
            // Convert seconds to minutes for display
            const stressSeconds = rec.stress_high;
            const stressMinutes = Math.round(stressSeconds / 60);
            // Risk normalized vs. 8 hours (480 minutes)
            const stressRisk = stressMinutes / 120;
            const row: WeekDailyRow = rowsMap.get(date) || { date };
            row.stress = {
              value: stressMinutes,
              score: stressRisk,
              source: "Oura stress (minutes high)",
            };
            rowsMap.set(date, row);
          }
        });
      }

      // Fetch Oura resilience data
      const resilienceRes = await fetch("/api/oura/daily_resilience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: week.week_start,
          end_date: week.week_end,
        }),
      });
      if (resilienceRes.ok) {
        const data = await resilienceRes.json();
        console.log("Resilience data response:", data);
        (data.data || []).forEach((rec: OuraResilienceRecord) => {
          const date = rec.day;
          if (rec.level) {
            const levelRiskMap: { [key: string]: number } = {
              exceptional: 0.0,
              solid: 0.2,
              adequate: 0.4,
              limited: 0.8,
              compromised: 1.0,
            };
            const resilienceLevel = rec.level.toLowerCase();
            const resilienceRisk = levelRiskMap[resilienceLevel] ?? 0.6;
            const row: WeekDailyRow = rowsMap.get(date) || { date };
            row.resilience = {
              value: resilienceLevel,
              score: resilienceRisk,
              source: "Oura resilience",
            };
            rowsMap.set(date, row);
          }
        });
      }

      // Fetch Oura readiness data
      const readinessRes = await fetch("/api/sleep/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: week.week_start,
          end_date: week.week_end,
        }),
      });
      if (readinessRes.ok) {
        const data = await readinessRes.json();
        console.log("Readiness data response:", data);
        const dailyMap = new Map<string, OuraReadinessRecord>();
        (data.data || []).forEach((rec: OuraReadinessRecord) => {
          const day =
            rec.day ||
            rec.date ||
            (rec.timestamp ? String(rec.timestamp).split("T")[0] : undefined);
          if (day) dailyMap.set(day, rec);
        });
        for (
          let d = new Date(weekStart);
          d <= weekEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const date = d.toISOString().split("T")[0];
          const rec = dailyMap.get(date);
          console.log(`Processing readiness for ${date}:`, rec);
          if (rec?.score && typeof rec.score === "number" && rec.score > 0) {
            const readinessValue = rec.score;
            const readinessRisk = Math.max(0, (100 - readinessValue) / 100);
            const row = rowsMap.get(date) || { date };
            row.readiness = {
              value: readinessValue,
              score: readinessRisk,
              source: "Oura readiness",
            };
            rowsMap.set(date, row);
          }
        }
      }

      // Build final rows; include only days that have a sleep score
      const rows: WeekDailyRow[] = Array.from(rowsMap.values())
        .filter((row) => row.sleepScore && row.sleepScore.value > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      setWeekDailyMetrics((prev) => ({ ...prev, [weekIndex]: rows }));

      // Compute week averages
      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : undefined;
      const readinessAvg = avg(
        rows
          .map((r) => r.readiness?.value)
          .filter((v): v is number => typeof v === "number")
      );
      const sleepScoreAvg = avg(
        rows
          .map((r) => r.sleepScore?.value)
          .filter((v): v is number => typeof v === "number")
      );
      const caloriesAvg = avg(
        rows
          .map((r) => r.calories?.value)
          .filter((v): v is number => typeof v === "number")
      );
      const rhrAvg = avg(
        rows
          .map((r) => r.rhr?.value)
          .filter((v): v is number => typeof v === "number")
      );
      const hrvAvg = avg(
        rows
          .map((r) => r.hrv?.value)
          .filter((v): v is number => typeof v === "number")
      );
      const stressAvg = avg(
        rows
          .map((r) => r.stress?.value)
          .filter((v): v is number => typeof v === "number")
      );
      // For resilience, we need to convert string levels to numeric values for averaging
      const resilienceNumericValues = rows
        .map((r) => {
          if (!r.resilience?.value) return null;
          const levelMap: { [key: string]: number } = {
            exceptional: 5,
            solid: 4,
            adequate: 3,
            limited: 2,
            compromised: 1,
          };
          return levelMap[r.resilience.value] ?? 3;
        })
        .filter((v): v is number => typeof v === "number");
      const resilienceAvg =
        resilienceNumericValues.length > 0
          ? resilienceNumericValues.reduce((s, v) => s + v, 0) /
            resilienceNumericValues.length
          : undefined;

      setWeekAverages((prev) => ({
        ...prev,
        [weekIndex]: {
          readiness: readinessAvg,
          sleepScore: sleepScoreAvg,
          calories: caloriesAvg,
          rhr: rhrAvg,
          hrv: hrvAvg,
          stress: stressAvg,
          resilience: resilienceAvg,
        },
      }));
    } catch (error) {
      console.error("Error fetching week daily metrics:", error);
      // keep UI silent here; week still toggles but shows no data
    }
  };

  const handleReadinessSync = async () => {
    try {
      const res = await fetch("/api/sleep/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      const data = await res.json();
      if (res.ok) {
        const sorted = [...data.data].sort((a, b) =>
          b.day.localeCompare(a.day)
        );
        setReadinessData(sorted);
        setSelectedReadinessDay(sorted[0]?.day || "");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to sync readiness data");
      console.error(err);
    }
  };

  const handleSync = async () => {
    try {
      const res = await fetch("/api/sleep/sleep_detail_days", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      const data = await res.json();
      if (res.ok) {
        const sorted = [...data.data].sort((a, b) =>
          b.day.localeCompare(a.day)
        );
        setSleepData(sorted);
        setSelectedDay(sorted[0]?.day || "");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to sync sleep data");
      console.error(err);
    }
  };

  const selectedData = sleepData.find((item) => item.day === selectedDay);

  const [sessionId, setSessionId] = useState("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sleep/sleep_details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await res.json();
      if (res.ok) {
        setSessionData(data);
      } else {
        alert(data.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch session data");
    } finally {
      setLoading(false);
    }
  };

  const handleBurnoutCalculation = async () => {
    // Strava access token no longer required

    try {
      setBurnoutLoading(true);
      const res = await fetch("/api/burnout/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          // Strava access removed
          weights: burnoutWeights,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBurnoutScores(data.weekly_scores);
        setBurnoutSummary(data.summary);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to calculate burnout score");
      console.error(err);
    } finally {
      setBurnoutLoading(false);
    }
  };

  const getBurnoutRiskLevel = (score: number): string => {
    if (score <= 0.3) return "Low Risk";
    if (score <= 0.6) return "Moderate Risk";
    return "High Risk";
  };

  const getBurnoutColor = (score: number): string => {
    if (score <= 0.3) return "text-green-400";
    if (score <= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <>
      <Head>
        <title>Stitch Design · Recovery</title>
        {/* Google Fonts & Tailwind JS already loaded via _app.tsx or layout */}
      </Head>

      <div className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden">
        {/* Header at the top */}
        <Header />

        <div className="flex h-full flex-1 justify-center">
          {/* Main content */}
          <div className="flex flex-1 flex-col max-w-[960px]">
            {/* 1. Recovery Header */}
            <RecoveryHeader />

            {/* 2. Sleep Data Range Picker */}
            <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
              Load Sleep Data by Date Range
            </h2>

            <div className="flex items-center gap-4 px-4 pb-4">
              <label className="text-white text-sm">
                Start Date:
                <input
                  type="date"
                  className="ml-2 rounded-md bg-[#1e2a28] text-white p-1 text-sm border border-[#3b5450]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="text-white text-sm">
                End Date:
                <input
                  type="date"
                  className="ml-2 rounded-md bg-[#1e2a28] text-white p-1 text-sm border border-[#3b5450]"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <button
                onClick={handleSync}
                className="rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-white hover:bg-[#36514e] transition"
              >
                Sync Sleep Data
              </button>
            </div>

            {/* 3. Sleep Data Display */}
            {sleepData.length > 0 && (
              <div className="px-4 pb-6 text-sm text-white">
                <label className="font-semibold mr-2">Select Day:</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-[#1e2a28] text-white p-2 rounded-md border border-[#3b5450]"
                >
                  {sleepData.map((item) => (
                    <option key={item.id} value={item.day}>
                      {item.day}
                    </option>
                  ))}
                </select>

                {selectedData && (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-green-400">
                          Basic Info
                        </h3>
                        <p>
                          <strong>ID:</strong> {selectedData.id}
                        </p>
                        <p>
                          <strong>Day:</strong> {selectedData.day}
                        </p>
                        <p>
                          <strong>Type:</strong> {selectedData.type}
                        </p>
                        <p>
                          <strong>Algorithm Version:</strong>{" "}
                          {selectedData.sleep_algorithm_version}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-green-400">
                          Sleep Schedule
                        </h3>
                        <p>
                          <strong>Bedtime:</strong> {selectedData.bedtime_start}{" "}
                          → {selectedData.bedtime_end}
                        </p>
                        <p>
                          <strong>Time in Bed:</strong>{" "}
                          {Math.round(selectedData.time_in_bed / 60)} min
                        </p>
                        <p>
                          <strong>Latency:</strong>{" "}
                          {Math.round(selectedData.latency / 60)} min
                        </p>
                        <p>
                          <strong>Efficiency:</strong> {selectedData.efficiency}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-blue-400">
                          Sleep Stages
                        </h3>
                        <p>
                          <strong>Total Sleep:</strong>{" "}
                          {Math.round(selectedData.total_sleep_duration / 60)}{" "}
                          min
                        </p>
                        <p>
                          <strong>Deep Sleep:</strong>{" "}
                          {Math.round(selectedData.deep_sleep_duration / 60)}{" "}
                          min
                        </p>
                        <p>
                          <strong>REM Sleep:</strong>{" "}
                          {Math.round(selectedData.rem_sleep_duration / 60)} min
                        </p>
                        <p>
                          <strong>Light Sleep:</strong>{" "}
                          {Math.round(selectedData.light_sleep_duration / 60)}{" "}
                          min
                        </p>
                        <p>
                          <strong>Awake Time:</strong>{" "}
                          {Math.round(selectedData.awake_time / 60)} min
                        </p>
                        <p>
                          <strong>Restless Periods:</strong>{" "}
                          {selectedData.restless_periods}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-red-400">
                          Vitals
                        </h3>
                        <p>
                          <strong>Avg Heart Rate:</strong>{" "}
                          {selectedData.average_heart_rate} bpm
                        </p>
                        <p>
                          <strong>Lowest Heart Rate:</strong>{" "}
                          {selectedData.lowest_heart_rate} bpm
                        </p>
                        <p>
                          <strong>Avg HRV:</strong> {selectedData.average_hrv}{" "}
                          ms
                        </p>
                        <p>
                          <strong>Avg Breath Rate:</strong>{" "}
                          {selectedData.average_breath} breaths/min
                        </p>
                        <p>
                          <strong>Low Battery Alert:</strong>{" "}
                          {selectedData.low_battery_alert ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-lg text-purple-400">
                        Readiness Score
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p>
                            <strong>Score:</strong>{" "}
                            {selectedData.readiness.score}
                          </p>
                          <p>
                            <strong>Score Delta:</strong>{" "}
                            {selectedData.readiness_score_delta}
                          </p>
                          <p>
                            <strong>Sleep Score Delta:</strong>{" "}
                            {selectedData.sleep_score_delta}
                          </p>
                          <p>
                            <strong>Temperature Deviation:</strong>{" "}
                            {selectedData.readiness.temperature_deviation}°C
                          </p>
                          <p>
                            <strong>Temperature Trend:</strong>{" "}
                            {selectedData.readiness.temperature_trend_deviation}
                            °C
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold mb-2">Contributors:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>
                              Activity Balance:{" "}
                              {
                                selectedData.readiness.contributors
                                  .activity_balance
                              }
                            </li>
                            <li>
                              Body Temperature:{" "}
                              {
                                selectedData.readiness.contributors
                                  .body_temperature
                              }
                            </li>
                            <li>
                              HRV Balance:{" "}
                              {selectedData.readiness.contributors.hrv_balance}
                            </li>
                            <li>
                              Previous Day Activity:{" "}
                              {
                                selectedData.readiness.contributors
                                  .previous_day_activity
                              }
                            </li>
                            <li>
                              Previous Night:{" "}
                              {
                                selectedData.readiness.contributors
                                  .previous_night
                              }
                            </li>
                            <li>
                              Recovery Index:{" "}
                              {
                                selectedData.readiness.contributors
                                  .recovery_index
                              }
                            </li>
                            <li>
                              Resting Heart Rate:{" "}
                              {
                                selectedData.readiness.contributors
                                  .resting_heart_rate
                              }
                            </li>
                            <li>
                              Sleep Balance:{" "}
                              {
                                selectedData.readiness.contributors
                                  .sleep_balance
                              }
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-yellow-400">
                          Heart Rate Data
                        </h3>
                        <p>
                          <strong>Interval:</strong>{" "}
                          {selectedData.heart_rate.interval}s
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {selectedData.heart_rate.timestamp}
                        </p>
                        <p>
                          <strong>Data Points:</strong>{" "}
                          {selectedData.heart_rate.items.length}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-cyan-400">
                          HRV Data
                        </h3>
                        <p>
                          <strong>Interval:</strong> {selectedData.hrv.interval}
                          s
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {selectedData.hrv.timestamp}
                        </p>
                        <p>
                          <strong>Data Points:</strong>{" "}
                          {selectedData.hrv.items.length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Readiness Data Section */}
            <div className="px-4 pb-6 text-sm text-white">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">
                Daily Readiness Scores
              </h2>
              <button
                onClick={handleReadinessSync}
                className="rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-white hover:bg-[#36514e] transition mb-4"
              >
                Sync Readiness Data
              </button>

              {readinessData.length > 0 && (
                <>
                  <div className="mb-4">
                    <label className="font-semibold mr-2">Select Day:</label>
                    <select
                      value={selectedReadinessDay}
                      onChange={(e) => setSelectedReadinessDay(e.target.value)}
                      className="bg-[#1e2a28] text-white p-2 rounded-md border border-[#3b5450]"
                    >
                      {readinessData.map((item) => (
                        <option key={item.id} value={item.day}>
                          {item.day}
                        </option>
                      ))}
                    </select>
                  </div>

                  {readinessData
                    .filter((item) => item.day === selectedReadinessDay)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#1e2a28] p-4 rounded-lg space-y-3 border border-[#3b5450]"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h3 className="font-bold text-lg text-orange-400">
                              Readiness Overview
                            </h3>
                            <p>
                              <strong>Score:</strong> {item.score}
                            </p>
                            <p>
                              <strong>Temperature Deviation:</strong>{" "}
                              {item.temperature_deviation}°C
                            </p>
                            <p>
                              <strong>Temperature Trend Deviation:</strong>{" "}
                              {item.temperature_trend_deviation}°C
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-bold text-lg text-orange-400">
                              Contributors
                            </h3>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                              {Object.entries(item.contributors).map(
                                ([key, val]) => (
                                  <li key={key}>
                                    {key.replaceAll("_", " ")}: {String(val)}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* 5. Sleep Session Data Section */}
            <div className="px-4 pb-6 text-sm text-white">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">
                Sleep Session Details
              </h2>

              <div className="flex items-center gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Enter Session ID"
                  className="rounded-md bg-[#1e2a28] border border-[#3b5450] p-2 text-white text-sm flex-1 max-w-xs"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
                <button
                  onClick={fetchSessionData}
                  className="rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-white hover:bg-[#36514e] transition"
                >
                  {loading ? "Loading..." : "Get Data"}
                </button>
              </div>

              {sessionData && (
                <div className="bg-[#1e2a28] p-4 rounded-lg space-y-2 border border-[#3b5450]">
                  <h3 className="font-bold text-lg text-indigo-400 mb-3">
                    Session Data
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p>
                        <strong>Day:</strong> {sessionData.day}
                      </p>
                      <p>
                        <strong>Bedtime:</strong> {sessionData.bedtime_start} →{" "}
                        {sessionData.bedtime_end}
                      </p>
                      <p>
                        <strong>Type:</strong> {sessionData.type}
                      </p>
                      <p>
                        <strong>Efficiency:</strong> {sessionData.efficiency}%
                      </p>
                      <p>
                        <strong>Latency:</strong>{" "}
                        {Math.round(sessionData.latency / 60)} min
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p>
                        <strong>Total Sleep:</strong>{" "}
                        {Math.round(sessionData.total_sleep_duration / 60)} min
                      </p>
                      <p>
                        <strong>Deep Sleep:</strong>{" "}
                        {Math.round(sessionData.deep_sleep_duration / 60)} min
                      </p>
                      <p>
                        <strong>REM Sleep:</strong>{" "}
                        {Math.round(sessionData.rem_sleep_duration / 60)} min
                      </p>
                      <p>
                        <strong>Avg Heart Rate:</strong>{" "}
                        {sessionData.average_heart_rate} bpm
                      </p>
                      <p>
                        <strong>Avg HRV:</strong> {sessionData.average_hrv} ms
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Burnout Calculation Section */}
            <div className="px-4 pb-6 text-sm text-white">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3">
                Burnout Risk Analysis
              </h2>

              <div className="bg-[#1e2a28] p-4 rounded-lg space-y-4 border border-[#3b5450] mb-4">
                <h3 className="font-bold text-lg text-orange-400">
                  Configuration
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Strava configuration removed */}

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Date Range:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="flex-1 rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      <span className="text-white self-center">to</span>
                      <input
                        type="date"
                        className="flex-1 rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Score Weights:
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs mb-1">
                        HRV Drop (20%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.hrv}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            hrv: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Resting HR (15%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.rhr}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            rhr: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Sleep Score (20%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.sleep}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            sleep: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Active Calories (10%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.subjective}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            subjective: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Readiness Score (10%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.readiness}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            readiness: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Stress Score (15%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.stress}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            stress: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Resilience Score (10%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.resilience}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            resilience: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBurnoutCalculation}
                  disabled={burnoutLoading}
                  className="w-full rounded-lg bg-[#283937] px-4 py-3 text-sm font-bold text-white hover:bg-[#36514e] transition disabled:opacity-50"
                >
                  {burnoutLoading ? "Calculating..." : "Calculate Burnout Risk"}
                </button>
              </div>

              {/* Burnout Results */}
              {burnoutSummary && (
                <div className="bg-[#1e2a28] p-4 rounded-lg space-y-4 border border-[#3b5450] mb-4">
                  <h3 className="font-bold text-lg text-orange-400">Summary</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Average Score</p>
                      <p
                        className={`text-lg font-bold ${getBurnoutColor(
                          burnoutSummary.average_score
                        )}`}
                      >
                        {burnoutSummary.average_score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getBurnoutRiskLevel(burnoutSummary.average_score)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Highest Score</p>
                      <p
                        className={`text-lg font-bold ${getBurnoutColor(
                          burnoutSummary.highest_score
                        )}`}
                      >
                        {burnoutSummary.highest_score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getBurnoutRiskLevel(burnoutSummary.highest_score)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Lowest Score</p>
                      <p
                        className={`text-lg font-bold ${getBurnoutColor(
                          burnoutSummary.lowest_score
                        )}`}
                      >
                        {burnoutSummary.lowest_score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getBurnoutRiskLevel(burnoutSummary.lowest_score)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Total Weeks</p>
                      <p className="text-lg font-bold text-white">
                        {burnoutSummary.total_weeks}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly Breakdown */}
              {burnoutScores.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-orange-400">
                    Weekly Breakdown
                  </h3>
                  {burnoutScores.map((week, index) => (
                    <div
                      key={index}
                      className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] cursor-pointer"
                      onClick={() => handleToggleWeek(index)}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-white">
                          Week {index + 1}: {week.week_start} to {week.week_end}
                        </h4>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${getBurnoutColor(
                              week.total_score
                            )}`}
                          >
                            {week.total_score}
                          </p>
                          <p className="text-xs text-gray-400">
                            {getBurnoutRiskLevel(week.total_score)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-gray-400">Avg Readiness</p>
                          <p className="font-semibold text-blue-400">
                            {weekAverages[index]?.readiness?.toFixed(0) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg Sleep Score</p>
                          <p className="font-semibold text-blue-400">
                            {weekAverages[index]?.sleepScore?.toFixed(0) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg Active Calories</p>
                          <p className="font-semibold text-blue-400">
                            {weekAverages[index]?.calories?.toFixed(0) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg RHR</p>
                          <p className="font-semibold text-blue-400">
                            {weekAverages[index]?.rhr?.toFixed(0) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg HRV</p>
                          <p className="font-semibold text-blue-400">
                            {weekAverages[index]?.hrv?.toFixed(0) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg Stress (min)</p>
                          <p className="font-semibold text-red-400">
                            {weekAverages[index]?.stress?.toFixed(0) ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Avg Resilience</p>
                          <p className="font-semibold text-green-400">
                            {weekAverages[index]?.resilience
                              ? (() => {
                                  const levelMap = [
                                    "",
                                    "Compromised",
                                    "Limited",
                                    "Adequate",
                                    "Solid",
                                    "Exceptional",
                                  ];
                                  return (
                                    levelMap[
                                      Math.round(
                                        weekAverages[index]!.resilience!
                                      )
                                    ] || "Adequate"
                                  );
                                })()
                              : "—"}
                          </p>
                        </div>
                        <div></div> {/* Empty cell to fill the 4x2 grid */}
                      </div>

                      {expandedWeekIndex === index && (
                        <div className="mt-4 bg-[#111817] border border-[#3b5450] rounded-md overflow-hidden">
                          <div className="px-4 py-3 border-b border-[#3b5450] flex items-center justify-between">
                            <span className="text-sm text-gray-300">
                              Per-day details (only days with measurements)
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchWeekDailyMetrics(index);
                              }}
                              className="text-xs px-2 py-1 rounded bg-[#283937] text-white border border-[#3b5450] hover:bg-[#36514e]"
                            >
                              Refresh
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs text-left text-gray-200">
                              <thead className="bg-[#1e2a28] text-gray-300">
                                <tr>
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">HRV (ms)</th>
                                  <th className="px-3 py-2">HRV Score</th>
                                  <th className="px-3 py-2">HRV Source</th>
                                  <th className="px-3 py-2">
                                    Resting HR (bpm)
                                  </th>
                                  <th className="px-3 py-2">RHR Score</th>
                                  <th className="px-3 py-2">RHR Source</th>
                                  <th className="px-3 py-2">Calories (kcal)</th>
                                  <th className="px-3 py-2">Calories Score</th>
                                  <th className="px-3 py-2">Calories Source</th>
                                  <th className="px-3 py-2">Sleep Score</th>
                                  <th className="px-3 py-2">Sleep Risk</th>
                                  <th className="px-3 py-2">Sleep Source</th>
                                  <th className="px-3 py-2">Readiness</th>
                                  <th className="px-3 py-2">Readiness Risk</th>
                                  <th className="px-3 py-2">
                                    Readiness Source
                                  </th>
                                  <th className="px-3 py-2">Stress (min)</th>
                                  <th className="px-3 py-2">Stress Risk</th>
                                  <th className="px-3 py-2">Stress Source</th>
                                  <th className="px-3 py-2">Resilience</th>
                                  <th className="px-3 py-2">Resilience Risk</th>
                                  <th className="px-3 py-2">
                                    Resilience Source
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(weekDailyMetrics[index] || []).map(
                                  (row, i) => (
                                    <tr
                                      key={row.date + i}
                                      className={
                                        i % 2 === 0
                                          ? "bg-[#1a2423]"
                                          : "bg-[#16201f]"
                                      }
                                    >
                                      <td className="px-3 py-2 text-white whitespace-nowrap">
                                        {row.date}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.hrv
                                          ? row.hrv.value.toFixed(0)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.hrv
                                          ? row.hrv.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.hrv ? row.hrv.source : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.rhr
                                          ? row.rhr.value.toFixed(0)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.rhr
                                          ? row.rhr.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.rhr ? row.rhr.source : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.calories
                                          ? row.calories.value.toFixed(0)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.calories
                                          ? row.calories.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.calories
                                          ? row.calories.source
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.sleepScore
                                          ? row.sleepScore.value.toFixed(0)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.sleepScore
                                          ? row.sleepScore.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.sleepScore
                                          ? row.sleepScore.source
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.readiness
                                          ? row.readiness.value.toFixed(0)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.readiness
                                          ? row.readiness.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.readiness
                                          ? row.readiness.source
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.stress
                                          ? row.stress.value.toFixed(0)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.stress
                                          ? row.stress.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.stress ? row.stress.source : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.resilience
                                          ? String(row.resilience.value)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.resilience
                                          ? row.resilience.score.toFixed(2)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {row.resilience
                                          ? row.resilience.source
                                          : "—"}
                                      </td>
                                    </tr>
                                  )
                                )}
                                {(!weekDailyMetrics[index] ||
                                  weekDailyMetrics[index].length === 0) && (
                                  <tr>
                                    <td
                                      className="px-3 py-3 text-center text-gray-400"
                                      colSpan={10}
                                    >
                                      No daily measurements found for this week.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Burnout Risk Graph */}
              {burnoutScores.length > 0 && (
                <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mt-4">
                  <h3 className="font-bold text-lg text-orange-400 mb-4">
                    Burnout Risk Trend
                  </h3>

                  <div className="relative h-64 w-full">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${Math.max(
                        800,
                        burnoutScores.length * 100
                      )} 240`}
                      className="overflow-x-auto"
                    >
                      {/* Grid lines */}
                      <defs>
                        <pattern
                          id="grid"
                          width="100"
                          height="48"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 100 0 L 0 0 0 48"
                            fill="none"
                            stroke="#3b5450"
                            strokeWidth="0.5"
                            opacity="0.3"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      {/* Y-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1.0].map((value, index) => (
                        <g key={index}>
                          <text
                            x="10"
                            y={240 - index * 48}
                            fill="#9ca3af"
                            fontSize="12"
                            textAnchor="start"
                            dominantBaseline="middle"
                          >
                            {value.toFixed(2)}
                          </text>
                          <line
                            x1="50"
                            y1={240 - index * 48}
                            x2="100%"
                            y2={240 - index * 48}
                            stroke="#3b5450"
                            strokeWidth="0.5"
                            opacity="0.5"
                          />
                        </g>
                      ))}

                      {/* Risk level zones */}
                      <rect
                        x="50"
                        y="0"
                        width="100%"
                        height="72"
                        fill="#dc2626"
                        opacity="0.1"
                      />
                      <rect
                        x="50"
                        y="72"
                        width="100%"
                        height="72"
                        fill="#ca8a04"
                        opacity="0.1"
                      />
                      <rect
                        x="50"
                        y="144"
                        width="100%"
                        height="96"
                        fill="#16a34a"
                        opacity="0.1"
                      />

                      {/* Zone labels */}
                      <text
                        x="60"
                        y="36"
                        fill="#dc2626"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        HIGH RISK
                      </text>
                      <text
                        x="60"
                        y="108"
                        fill="#ca8a04"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        MODERATE
                      </text>
                      <text
                        x="60"
                        y="180"
                        fill="#16a34a"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        LOW RISK
                      </text>

                      {/* Data points and line */}
                      {burnoutScores.map((week, index) => {
                        const x = 100 + index * 100;
                        const y = 240 - week.total_score * 240;
                        const color =
                          week.total_score > 0.6
                            ? "#dc2626"
                            : week.total_score > 0.3
                            ? "#ca8a04"
                            : "#16a34a";

                        return (
                          <g key={index}>
                            {/* Data point */}
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill={color}
                              stroke="#ffffff"
                              strokeWidth="2"
                            />

                            {/* Week label */}
                            <text
                              x={x}
                              y="230"
                              fill="#9ca3af"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              W{index + 1}
                            </text>

                            {/* Score label */}
                            <text
                              x={x}
                              y={y - 10}
                              fill={color}
                              fontSize="10"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {week.total_score.toFixed(2)}
                            </text>

                            {/* Connecting line */}
                            {index > 0 && (
                              <line
                                x1={100 + (index - 1) * 100}
                                y1={
                                  240 -
                                  burnoutScores[index - 1].total_score * 240
                                }
                                x2={x}
                                y2={y}
                                stroke="#6b7280"
                                strokeWidth="2"
                                opacity="0.6"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* X-axis */}
                      <line
                        x1="50"
                        y1="240"
                        x2="100%"
                        y2="240"
                        stroke="#6b7280"
                        strokeWidth="2"
                      />

                      {/* Y-axis */}
                      <line
                        x1="50"
                        y1="0"
                        x2="50"
                        y2="240"
                        stroke="#6b7280"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  {/* Graph legend */}
                  <div className="mt-4 flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-400">High Risk (&gt;0.6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-yellow-400">
                        Moderate Risk (0.3-0.6)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-400">Low Risk (&lt;0.3)</span>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="text-gray-400">Weeks Analyzed</p>
                      <p className="text-white font-bold">
                        {burnoutScores.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Trend</p>
                      <p
                        className={`font-bold ${
                          burnoutScores.length >= 2
                            ? burnoutScores[burnoutScores.length - 1]
                                .total_score > burnoutScores[0].total_score
                              ? "text-red-400"
                              : "text-green-400"
                            : "text-gray-400"
                        }`}
                      >
                        {burnoutScores.length >= 2
                          ? burnoutScores[burnoutScores.length - 1]
                              .total_score > burnoutScores[0].total_score
                            ? "↗ Increasing"
                            : "↘ Decreasing"
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Peak Week</p>
                      <p className="text-white font-bold">
                        W
                        {burnoutScores.reduce(
                          (maxIndex, week, index) =>
                            week.total_score >
                            burnoutScores[maxIndex].total_score
                              ? index
                              : maxIndex,
                          0
                        ) + 1}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
