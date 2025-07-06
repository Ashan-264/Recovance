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
  breakdown: {
    acwr_score: number;
    hrv_drop_score: number;
    resting_hr_score: number;
    sleep_debt_score: number;
    training_streak_score: number;
    perceived_exertion_score: number;
  };
  weights: {
    acwr: number;
    hrv: number;
    rhr: number;
    sleep: number;
    streak: number;
    subjective: number;
  };
  week_start: string;
  week_end: string;
}

interface BurnoutSummary {
  average_score: number;
  highest_score: number;
  lowest_score: number;
  total_weeks: number;
}

interface StravaActivity {
  id: number;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  description?: string;
  suffer_score?: number;
}

interface DailyExertion {
  count: number;
  highEffort: number;
}

export default function RecoveryPage() {
  const [startDate, setStartDate] = useState("2021-11-01");
  const [endDate, setEndDate] = useState("2025-12-01");
  const [sleepData, setSleepData] = useState<SleepDataItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [readinessData, setReadinessData] = useState<ReadinessDataItem[]>([]);
  const [selectedReadinessDay, setSelectedReadinessDay] = useState<string>("");

  // Burnout calculation state
  const [stravaAccessToken, setStravaAccessToken] = useState("");
  const [burnoutScores, setBurnoutScores] = useState<BurnoutScore[]>([]);
  const [burnoutSummary, setBurnoutSummary] = useState<BurnoutSummary | null>(
    null
  );
  const [burnoutLoading, setBurnoutLoading] = useState(false);
  const [burnoutWeights, setBurnoutWeights] = useState({
    acwr: 0.3,
    hrv: 0.2,
    rhr: 0.15,
    sleep: 0.2,
    streak: 0.1,
    subjective: 0.05,
  });

  // State for showing daily details
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(
    null
  );
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [dailyDetails, setDailyDetails] = useState<
    Array<{ date: string; value: number; score: number }>
  >([]);

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
    if (!stravaAccessToken) {
      alert("Please enter your Strava access token");
      return;
    }

    try {
      setBurnoutLoading(true);
      const res = await fetch("/api/burnout/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          access_token: stravaAccessToken,
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

  // Function to show daily details for a specific metric
  const showDailyDetails = async (weekIndex: number, metric: string) => {
    setSelectedWeekIndex(weekIndex);
    setSelectedMetric(metric);

    const week = burnoutScores[weekIndex];
    const weekStart = new Date(week.week_start);
    const weekEnd = new Date(week.week_end);

    try {
      const dailyData: Array<{ date: string; value: number; score: number }> =
        [];

      if (metric === "acwr") {
        // Fetch Strava activities for ACWR calculation
        if (!stravaAccessToken) {
          alert("Please enter your Strava access token to view ACWR details");
          return;
        }

        const startTimestamp = Math.floor(weekStart.getTime() / 1000);
        const endTimestamp = Math.floor(weekEnd.getTime() / 1000);

        const response = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&before=${endTimestamp}&per_page=200`,
          {
            headers: {
              Authorization: `Bearer ${stravaAccessToken}`,
            },
          }
        );

        if (response.ok) {
          const activities: StravaActivity[] = await response.json();

          // Group activities by date and calculate daily load
          const dailyLoads = new Map<string, number>();

          activities.forEach((activity: StravaActivity) => {
            const date = new Date(activity.start_date)
              .toISOString()
              .split("T")[0];
            const load =
              (activity.total_elevation_gain || 0) +
              (activity.distance || 0) * 0.1;
            dailyLoads.set(date, (dailyLoads.get(date) || 0) + load);
          });

          // Generate daily data for the week
          for (
            let d = new Date(weekStart);
            d <= weekEnd;
            d.setDate(d.getDate() + 1)
          ) {
            const date = d.toISOString().split("T")[0];
            const dailyLoad = dailyLoads.get(date) || 0;

            // Calculate ACWR for this day (simplified - in reality you'd need 7-day and 28-day averages)
            const acwrValue = dailyLoad > 0 ? Math.min(dailyLoad / 100, 2) : 0; // Normalized value
            const acwrScore =
              acwrValue > 1.5
                ? 1.0
                : acwrValue > 1.3
                ? 0.6
                : acwrValue > 0.8
                ? 0.1
                : 0.3;

            dailyData.push({
              date,
              value: dailyLoad,
              score: acwrScore,
            });
          }
        }
      } else if (["hrv", "rhr", "sleep"].includes(metric)) {
        // Fetch Oura sleep data for HRV, RHR, and sleep metrics
        const ouraToken = process.env.OURA_API_TOKEN;
        if (!ouraToken) {
          alert("Oura API token not configured");
          return;
        }

        const response = await fetch("/api/sleep/sleep_detail_days", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_date: week.week_start,
            end_date: week.week_end,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const sleepRecords: SleepDataItem[] = data.data || [];

          // Create a map of daily data
          const dailyMap = new Map<string, SleepDataItem>();
          sleepRecords.forEach((record: SleepDataItem) => {
            dailyMap.set(record.day, record);
          });

          // Generate daily data for the week
          for (
            let d = new Date(weekStart);
            d <= weekEnd;
            d.setDate(d.getDate() + 1)
          ) {
            const date = d.toISOString().split("T")[0];
            const record = dailyMap.get(date);

            if (record) {
              let value = 0;
              let score = 0;

              if (metric === "hrv") {
                value = record.average_hrv || 0;
                // Calculate HRV drop score (simplified)
                score = value > 0 ? Math.max(0, (100 - value) / 100) : 0;
              } else if (metric === "rhr") {
                value = record.average_heart_rate || 0;
                // Calculate RHR elevation score (simplified)
                score = value > 0 ? Math.min(1, (value - 50) / 20) : 0;
              } else if (metric === "sleep") {
                value = (record.total_sleep_duration || 0) / 3600; // Convert to hours
                // Calculate sleep debt score
                const targetSleep = 8;
                score =
                  value > 0
                    ? Math.max(0, (targetSleep - value) / targetSleep)
                    : 1;
              }

              dailyData.push({ date, value, score });
            } else {
              // No data for this day
              dailyData.push({ date, value: 0, score: 0 });
            }
          }
        }
      } else if (metric === "streak") {
        // Calculate training streak for each day
        if (!stravaAccessToken) {
          alert(
            "Please enter your Strava access token to view training streak details"
          );
          return;
        }

        const startTimestamp = Math.floor(weekStart.getTime() / 1000);
        const endTimestamp = Math.floor(weekEnd.getTime() / 1000);

        const response = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&before=${endTimestamp}&per_page=200`,
          {
            headers: {
              Authorization: `Bearer ${stravaAccessToken}`,
            },
          }
        );

        if (response.ok) {
          const activities: StravaActivity[] = await response.json();

          // Group activities by date
          const dailyActivities = new Map<string, number>();
          activities.forEach((activity: StravaActivity) => {
            const date = new Date(activity.start_date)
              .toISOString()
              .split("T")[0];
            dailyActivities.set(date, (dailyActivities.get(date) || 0) + 1);
          });

          // Calculate streak for each day
          let currentStreak = 0;
          for (
            let d = new Date(weekStart);
            d <= weekEnd;
            d.setDate(d.getDate() + 1)
          ) {
            const date = d.toISOString().split("T")[0];
            const hasActivity = dailyActivities.has(date);

            if (hasActivity) {
              currentStreak++;
            } else {
              currentStreak = 0;
            }

            const value = hasActivity ? 1 : 0;
            const score =
              currentStreak <= 3 ? 1.0 : currentStreak <= 6 ? 0.5 : 0.1;

            dailyData.push({ date, value, score });
          }
        }
      } else if (metric === "subjective") {
        // Calculate perceived exertion for each day
        if (!stravaAccessToken) {
          alert(
            "Please enter your Strava access token to view perceived exertion details"
          );
          return;
        }

        const startTimestamp = Math.floor(weekStart.getTime() / 1000);
        const endTimestamp = Math.floor(weekEnd.getTime() / 1000);

        const response = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${startTimestamp}&before=${endTimestamp}&per_page=200`,
          {
            headers: {
              Authorization: `Bearer ${stravaAccessToken}`,
            },
          }
        );

        if (response.ok) {
          const activities: StravaActivity[] = await response.json();

          // Group activities by date and calculate perceived exertion
          const dailyExertion = new Map<string, DailyExertion>();

          activities.forEach((activity: StravaActivity) => {
            const date = new Date(activity.start_date)
              .toISOString()
              .split("T")[0];
            const current = dailyExertion.get(date) || {
              count: 0,
              highEffort: 0,
            };

            const description = (activity.description || "").toLowerCase();
            const hasRPE =
              description.includes("rpe") ||
              description.includes("rate of perceived exertion");
            const highSufferScore =
              activity.suffer_score && activity.suffer_score > 100;

            current.count++;
            if (hasRPE || highSufferScore) {
              current.highEffort++;
            }

            dailyExertion.set(date, current);
          });

          // Generate daily data
          for (
            let d = new Date(weekStart);
            d <= weekEnd;
            d.setDate(d.getDate() + 1)
          ) {
            const date = d.toISOString().split("T")[0];
            const exertion = dailyExertion.get(date);

            if (exertion) {
              const value = exertion.count;
              const score =
                exertion.count > 0 ? exertion.highEffort / exertion.count : 0;
              dailyData.push({ date, value, score });
            } else {
              dailyData.push({ date, value: 0, score: 0 });
            }
          }
        }
      }

      setDailyDetails(dailyData);
    } catch (error) {
      console.error("Error fetching daily details:", error);
      alert(
        "Error fetching daily details. Please check your API tokens and try again."
      );
    }
  };

  // Function to close daily details
  const closeDailyDetails = () => {
    setSelectedWeekIndex(null);
    setSelectedMetric(null);
    setDailyDetails([]);
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
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Strava Access Token:
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your Strava access token"
                      className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                      value={stravaAccessToken}
                      onChange={(e) => setStravaAccessToken(e.target.value)}
                    />
                  </div>

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
                      <label className="block text-xs mb-1">ACWR (30%):</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.acwr}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            acwr: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
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
                        Sleep Debt (20%):
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
                        Training Streak (10%):
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-1 text-white text-sm"
                        value={burnoutWeights.streak}
                        onChange={(e) =>
                          setBurnoutWeights((prev) => ({
                            ...prev,
                            streak: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">
                        Perceived Exertion (5%):
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
                      className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]"
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

                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-gray-400">ACWR Score</p>
                          <button
                            onClick={() => showDailyDetails(index, "acwr")}
                            className="font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {week.breakdown.acwr_score}
                          </button>
                        </div>
                        <div>
                          <p className="text-gray-400">HRV Drop Score</p>
                          <button
                            onClick={() => showDailyDetails(index, "hrv")}
                            className="font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {week.breakdown.hrv_drop_score}
                          </button>
                        </div>
                        <div>
                          <p className="text-gray-400">Resting HR Score</p>
                          <button
                            onClick={() => showDailyDetails(index, "rhr")}
                            className="font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {week.breakdown.resting_hr_score}
                          </button>
                        </div>
                        <div>
                          <p className="text-gray-400">Sleep Debt Score</p>
                          <button
                            onClick={() => showDailyDetails(index, "sleep")}
                            className="font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {week.breakdown.sleep_debt_score}
                          </button>
                        </div>
                        <div>
                          <p className="text-gray-400">Training Streak Score</p>
                          <button
                            onClick={() => showDailyDetails(index, "streak")}
                            className="font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {week.breakdown.training_streak_score}
                          </button>
                        </div>
                        <div>
                          <p className="text-gray-400">Perceived Exertion</p>
                          <button
                            onClick={() =>
                              showDailyDetails(index, "subjective")
                            }
                            className="font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            {week.breakdown.perceived_exertion_score}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Daily Details Modal */}
              {selectedWeekIndex !== null && selectedMetric && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-[#1e2a28] p-6 rounded-lg border border-[#3b5450] max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-orange-400">
                        Daily Details: {selectedMetric.toUpperCase()} - Week{" "}
                        {selectedWeekIndex + 1}
                      </h3>
                      <button
                        onClick={closeDailyDetails}
                        className="text-gray-400 hover:text-white text-xl"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-2">
                      {dailyDetails.map((day, dayIndex) => (
                        <div
                          key={dayIndex}
                          className="flex justify-between items-center p-2 bg-[#283937] rounded"
                        >
                          <span className="text-white">{day.date}</span>
                          <div className="flex gap-4">
                            <span className="text-gray-400">
                              Value: {day.value.toFixed(2)}
                            </span>
                            <span className="text-gray-400">
                              Score: {day.score.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-400">
                        Note: This shows sample data. In a real implementation,
                        you would fetch actual daily metrics for this week.
                      </p>
                    </div>
                  </div>
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
