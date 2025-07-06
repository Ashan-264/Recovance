"use client";

import { useState } from "react";
import Header from "@/app/components/Header";

interface StravaActivity {
  id: number;
  start_date: string;
  distance?: number;
  total_elevation_gain?: number;
  description?: string;
  suffer_score?: number;
  moving_time?: number;
  type?: string;
}

interface OuraReadinessData {
  day: string;
  readiness_score?: number;
  hrv_rmssd?: number;
  resting_heart_rate?: number;
  sleep_score?: number;
  sleep_duration?: number;
  activity_score?: number;
}

interface OuraSleepData {
  day: string;
  average_hrv?: number;
  average_heart_rate?: number;
  total_sleep_duration?: number;
  sleep_score?: number;
}

interface WeeklyAlignmentScore {
  week_start: string;
  week_end: string;
  training_load_score: number;
  recovery_score: number;
  alignment_score: number;
  activities: StravaActivity[];
  readiness_data: OuraReadinessData[];
  sleep_data: OuraSleepData[];
  total_activities: number;
  total_duration: number;
}

interface WeeklyMismatch {
  week_start: string;
  week_end: string;
  training_load_score: number;
  recovery_score: number;
  mismatch_severity: "high" | "moderate" | "low";
  activities: StravaActivity[];
  readiness_data: OuraReadinessData[];
  sleep_data: OuraSleepData[];
  total_activities: number;
  total_duration: number;
  recommendations: string[];
}

interface RestDay {
  date: string;
  hrv_today: number;
  hrv_yesterday: number;
  hrv_improvement: number;
  sleep_duration: number;
  sleep_score: number;
  activity_score: number;
  recovery_efficiency: number;
  is_verified_rest: boolean;
}

interface AlignmentSummary {
  average_alignment: number;
  best_alignment_week: string;
  worst_alignment_week: string;
  total_weeks: number;
  total_activities: number;
  total_duration: number;
}

interface MismatchSummary {
  total_mismatches: number;
  high_severity_count: number;
  moderate_severity_count: number;
  low_severity_count: number;
  most_common_issue: string;
}

interface EfficiencySummary {
  total_rest_days: number;
  average_efficiency: number;
  best_rest_day: string;
  worst_rest_day: string;
  efficiency_trend: "improving" | "declining" | "stable";
}

export default function TrainingInsightsPage() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [stravaAccessToken, setStravaAccessToken] = useState("");

  // Alignment data
  const [alignmentData, setAlignmentData] = useState<WeeklyAlignmentScore[]>(
    []
  );
  const [alignmentLoading, setAlignmentLoading] = useState(false);
  const [alignmentSummary, setAlignmentSummary] =
    useState<AlignmentSummary | null>(null);

  // Mismatch data
  const [mismatchData, setMismatchData] = useState<WeeklyMismatch[]>([]);
  const [mismatchLoading, setMismatchLoading] = useState(false);
  const [mismatchSummary, setMismatchSummary] =
    useState<MismatchSummary | null>(null);

  // Recovery efficiency data
  const [efficiencyData, setEfficiencyData] = useState<RestDay[]>([]);
  const [efficiencyLoading, setEfficiencyLoading] = useState(false);
  const [efficiencySummary, setEfficiencySummary] =
    useState<EfficiencySummary | null>(null);

  const calculateAlignment = async () => {
    if (!stravaAccessToken) {
      alert("Please enter your Strava access token");
      return;
    }

    try {
      setAlignmentLoading(true);
      console.log("=== ALIGNMENT CALCULATION ===");
      console.log(`Date range: ${startDate} to ${endDate}`);

      const res = await fetch("/api/training/alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          access_token: stravaAccessToken,
        }),
      });

      const data = await res.json();
      console.log("Alignment API response:", data);

      if (res.ok) {
        setAlignmentData(data.weekly_scores);
        setAlignmentSummary(data.summary);
        console.log(
          `✅ Alignment: ${data.weekly_scores.length} weeks, avg: ${data.summary.average_alignment}`
        );
      } else {
        console.error("Alignment API error:", data.error);
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Failed to calculate alignment:", err);
      alert("Failed to calculate alignment");
    } finally {
      setAlignmentLoading(false);
    }
  };

  const calculateMismatches = async () => {
    if (!stravaAccessToken) {
      alert("Please enter your Strava access token");
      return;
    }

    try {
      setMismatchLoading(true);
      console.log("=== MISMATCH CALCULATION ===");
      console.log(`Date range: ${startDate} to ${endDate}`);

      const res = await fetch("/api/training/mismatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          access_token: stravaAccessToken,
        }),
      });

      const data = await res.json();
      console.log("Mismatch API response:", data);

      if (res.ok) {
        setMismatchData(data.weekly_mismatches);
        setMismatchSummary(data.summary);
        console.log(
          `✅ Mismatches: ${data.weekly_mismatches.length} found, ${data.summary.total_mismatches} total`
        );
      } else {
        console.error("Mismatch API error:", data.error);
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Failed to detect mismatches:", err);
      alert("Failed to detect mismatches");
    } finally {
      setMismatchLoading(false);
    }
  };

  const calculateEfficiency = async () => {
    if (!stravaAccessToken) {
      alert("Please enter your Strava access token");
      return;
    }

    try {
      setEfficiencyLoading(true);
      console.log("=== RECOVERY EFFICIENCY CALCULATION ===");
      console.log(`Date range: ${startDate} to ${endDate}`);

      const res = await fetch("/api/training/recovery-efficiency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          access_token: stravaAccessToken,
        }),
      });

      const data = await res.json();
      console.log("Recovery efficiency API response:", data);

      if (res.ok) {
        setEfficiencyData(data.rest_days);
        setEfficiencySummary(data.summary);
        console.log(
          `✅ Efficiency: ${data.rest_days.length} rest days, ${data.summary.total_rest_days} verified, avg: ${data.summary.average_efficiency}`
        );

        // Debug the data structure
        if (data.rest_days.length > 0) {
          console.log("Sample rest day:", data.rest_days[0]);
        }
        if (data.summary) {
          console.log("Summary:", data.summary);
        }
      } else {
        console.error("Recovery efficiency API error:", data.error);
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Failed to calculate recovery efficiency:", err);
      alert("Failed to calculate recovery efficiency");
    } finally {
      setEfficiencyLoading(false);
    }
  };

  const getAlignmentColor = (score: number): string => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getMismatchColor = (severity: string): string => {
    if (severity === "high") return "text-red-400";
    if (severity === "moderate") return "text-yellow-400";
    return "text-orange-400";
  };

  const getEfficiencyColor = (score: number): string => {
    if (score >= 70) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden">
      <Header />

      <div className="flex h-full grow flex-col">
        <div className="flex h-full flex-1 justify-center px-6 py-5">
          <div className="flex flex-1 flex-col max-w-[1200px]">
            {/* Header */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-[32px] font-bold leading-tight tracking-light text-white">
                  Training Insights
                </p>
                <p className="text-sm font-normal leading-normal text-[#9cbab5]">
                  Advanced analytics for training load and recovery optimization
                </p>
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mb-6">
              <h3 className="font-bold text-lg text-orange-400 mb-4">
                Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Start Date:
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    End Date:
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Strava Access Token:
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white"
                    value={stravaAccessToken}
                    onChange={(e) => setStravaAccessToken(e.target.value)}
                    placeholder="Enter your Strava access token"
                  />
                </div>
              </div>
            </div>

            {/* 1. Training Load-to-Recovery Alignment */}
            <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-orange-400">
                  Training Load-to-Recovery Alignment (Weekly)
                </h3>
                <button
                  onClick={calculateAlignment}
                  disabled={alignmentLoading}
                  className="rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-white hover:bg-[#36514e] transition disabled:opacity-50"
                >
                  {alignmentLoading ? "Calculating..." : "Calculate Alignment"}
                </button>
              </div>

              {alignmentSummary && (
                <div className="grid grid-cols-6 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Average Alignment</p>
                    <p
                      className={`text-lg font-bold ${getAlignmentColor(
                        alignmentSummary.average_alignment
                      )}`}
                    >
                      {alignmentSummary.average_alignment}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Best Week</p>
                    <p className="text-lg font-bold text-white">
                      {alignmentSummary.best_alignment_week}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Worst Week</p>
                    <p className="text-lg font-bold text-white">
                      {alignmentSummary.worst_alignment_week}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Total Weeks</p>
                    <p className="text-lg font-bold text-white">
                      {alignmentSummary.total_weeks}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Total Activities</p>
                    <p className="text-lg font-bold text-white">
                      {alignmentSummary.total_activities}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Total Duration</p>
                    <p className="text-lg font-bold text-white">
                      {formatDuration(alignmentSummary.total_duration)}
                    </p>
                  </div>
                </div>
              )}

              {alignmentData.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alignmentData.map((week, index) => (
                    <div
                      key={index}
                      className="bg-[#283937] p-3 rounded border border-[#3b5450]"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white font-semibold">
                            Week {index + 1}: {week.week_start} to{" "}
                            {week.week_end}
                          </span>
                          <p className="text-xs text-gray-400">
                            {week.total_activities} activities •{" "}
                            {formatDuration(week.total_duration)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-bold ${getAlignmentColor(
                              week.alignment_score
                            )}`}
                          >
                            Alignment: {week.alignment_score}
                          </p>
                          <p className="text-xs text-gray-400">
                            Load: {week.training_load_score} | Recovery:{" "}
                            {week.recovery_score}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Strain-Recovery Mismatch Timeline */}
            <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-orange-400">
                  Strain-Recovery Mismatch Timeline (Weekly)
                </h3>
                <button
                  onClick={calculateMismatches}
                  disabled={mismatchLoading}
                  className="rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-white hover:bg-[#36514e] transition disabled:opacity-50"
                >
                  {mismatchLoading ? "Detecting..." : "Detect Mismatches"}
                </button>
              </div>

              {mismatchSummary && (
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Total Mismatches</p>
                    <p className="text-lg font-bold text-red-400">
                      {mismatchSummary.total_mismatches}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">High Severity</p>
                    <p className="text-lg font-bold text-red-400">
                      {mismatchSummary.high_severity_count}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Moderate Severity</p>
                    <p className="text-lg font-bold text-yellow-400">
                      {mismatchSummary.moderate_severity_count}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Low Severity</p>
                    <p className="text-lg font-bold text-orange-400">
                      {mismatchSummary.low_severity_count}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Most Common Issue</p>
                    <p className="text-lg font-bold text-white capitalize">
                      {mismatchSummary.most_common_issue}
                    </p>
                  </div>
                </div>
              )}

              {mismatchData.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mismatchData.map((week, index) => (
                    <div
                      key={index}
                      className="bg-[#283937] p-3 rounded border border-[#3b5450]"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-white font-semibold">
                            Week {index + 1}: {week.week_start} to{" "}
                            {week.week_end}
                          </span>
                          <p className="text-xs text-gray-400">
                            {week.total_activities} activities •{" "}
                            {formatDuration(week.total_duration)}
                          </p>
                          <p
                            className={`text-sm font-bold ${getMismatchColor(
                              week.mismatch_severity
                            )}`}
                          >
                            {week.mismatch_severity.toUpperCase()} SEVERITY
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            Load: {week.training_load_score} | Recovery:{" "}
                            {week.recovery_score}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-400">
                          Recommendations:
                        </p>
                        <ul className="text-xs text-white mt-1">
                          {week.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Recovery Efficiency Index */}
            <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-orange-400">
                  Recovery Efficiency Index
                </h3>
                <button
                  onClick={calculateEfficiency}
                  disabled={efficiencyLoading}
                  className="rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-white hover:bg-[#36514e] transition disabled:opacity-50"
                >
                  {efficiencyLoading
                    ? "Calculating..."
                    : "Calculate Efficiency"}
                </button>
              </div>

              {efficiencySummary && (
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Total Rest Days</p>
                    <p className="text-lg font-bold text-white">
                      {efficiencySummary.total_rest_days}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Average Efficiency</p>
                    <p
                      className={`text-lg font-bold ${getEfficiencyColor(
                        efficiencySummary.average_efficiency
                      )}`}
                    >
                      {efficiencySummary.average_efficiency}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Best Rest Day</p>
                    <p className="text-lg font-bold text-white">
                      {efficiencySummary.best_rest_day}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Worst Rest Day</p>
                    <p className="text-lg font-bold text-white">
                      {efficiencySummary.worst_rest_day}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Trend</p>
                    <p
                      className={`text-lg font-bold ${
                        efficiencySummary.efficiency_trend === "improving"
                          ? "text-green-400"
                          : efficiencySummary.efficiency_trend === "declining"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {efficiencySummary.efficiency_trend.toUpperCase()}
                    </p>
                  </div>
                </div>
              )}

              {efficiencyData.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {efficiencyData
                    .filter((day) => day.is_verified_rest)
                    .map((day, index) => (
                      <div
                        key={index}
                        className="bg-[#283937] p-3 rounded border border-[#3b5450]"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">
                            {day.date}
                          </span>
                          <div className="text-right">
                            <p
                              className={`text-sm font-bold ${getEfficiencyColor(
                                day.recovery_efficiency
                              )}`}
                            >
                              Efficiency: {day.recovery_efficiency}
                            </p>
                            <p className="text-xs text-gray-400">
                              HRV: +{day.hrv_improvement.toFixed(1)}ms | Sleep:{" "}
                              {day.sleep_duration.toFixed(1)}h
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
