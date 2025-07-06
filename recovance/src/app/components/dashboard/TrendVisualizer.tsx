// components/Dashboard/TrendVisualizer.tsx
"use client";

import { useState } from "react";

interface TrainingData {
  alignment?: {
    weekly_scores: Array<{
      week_start: string;
      week_end: string;
      training_load_score: number;
      recovery_score: number;
      alignment_score: number;
    }>;
    summary: {
      average_alignment: number;
      total_weeks: number;
    };
  };
  mismatch?: {
    weekly_mismatches: Array<{
      week_start: string;
      week_end: string;
      training_load_score: number;
      recovery_score: number;
      mismatch_severity: "high" | "moderate" | "low";
    }>;
    summary: {
      total_mismatches: number;
      high_severity_count: number;
    };
  };
  recovery?: {
    rest_days: Array<{
      date: string;
      recovery_efficiency: number;
      hrv_improvement: number;
      sleep_duration: number;
      sleep_score: number;
    }>;
    summary: {
      average_efficiency: number;
      total_rest_days: number;
    };
  };
}

export default function TrendVisualizer() {
  const [trainingData, setTrainingData] = useState<TrainingData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stravaToken, setStravaToken] = useState("");
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");

  // Fetch real training data from APIs
  const fetchTrainingData = async () => {
    if (!stravaToken.trim()) {
      setError("Please enter your Strava access token");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const requestData = {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        access_token: stravaToken.trim(),
      };

      // Fetch all three datasets in parallel
      const [alignmentResponse, mismatchResponse, recoveryResponse] =
        await Promise.all([
          fetch("/api/training/alignment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
          }),
          fetch("/api/training/mismatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
          }),
          fetch("/api/training/recovery-efficiency", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
          }),
        ]);

      // Check if all responses are successful
      if (
        !alignmentResponse.ok ||
        !mismatchResponse.ok ||
        !recoveryResponse.ok
      ) {
        const errorText = await alignmentResponse.text();
        throw new Error(`Failed to fetch training data: ${errorText}`);
      }

      // Parse responses
      const [alignmentData, mismatchData, recoveryData] = await Promise.all([
        alignmentResponse.json(),
        mismatchResponse.json(),
        recoveryResponse.json(),
      ]);

      setTrainingData({
        alignment: alignmentData,
        mismatch: mismatchData,
        recovery: recoveryData,
      });
    } catch (err) {
      console.error("Error fetching training data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load training data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadData = () => {
    setIsConfigured(true);
    fetchTrainingData();
  };

  // Configuration section
  if (!isConfigured) {
    return (
      <div className="w-full px-6 py-8">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Training Analytics
        </h2>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Configure Data Source
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strava Access Token
              </label>
              <input
                type="password"
                value={stravaToken}
                onChange={(e) => setStravaToken(e.target.value)}
                placeholder="Enter your Strava access token"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get your access token from Strava API settings
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleLoadData}
              disabled={!stravaToken.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Load Training Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full px-6 py-8">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Training Analytics
        </h2>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-6 py-8">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Training Analytics
        </h2>
        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-white">
          Training Analytics
        </h2>
        <div className="flex gap-2">
          <div className="flex bg-gray-700 rounded p-1">
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === "weekly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Monthly
            </button>
          </div>
          <button
            onClick={() => setIsConfigured(false)}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Configure
          </button>
          <button
            onClick={fetchTrainingData}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-600"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Show message if no data */}
      {!loading &&
        !error &&
        !trainingData.alignment?.weekly_scores?.length &&
        !trainingData.mismatch?.weekly_mismatches?.length &&
        !trainingData.recovery?.rest_days?.length && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <p className="text-gray-300 text-center">
              No training data available for the selected date range. Try
              adjusting your dates or check your Strava access token.
            </p>
          </div>
        )}

      {/* 1. Load-Recovery Alignment Chart */}
      {trainingData.alignment?.weekly_scores &&
        trainingData.alignment.weekly_scores.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Load-Recovery Alignment (
              {viewMode === "weekly" ? "Weekly" : "Monthly"} View)
            </h3>
            <div className="relative h-80 w-full">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 900 300"
                className="overflow-x-auto"
              >
                {/* Grid */}
                <defs>
                  <pattern
                    id="grid"
                    width="100"
                    height="60"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 100 0 L 0 0 0 60"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Y-axis labels */}
                <text
                  x="40"
                  y="25"
                  fill="#9ca3af"
                  fontSize="12"
                  fontWeight="bold"
                >
                  100
                </text>
                <text x="40" y="75" fill="#9ca3af" fontSize="12">
                  75
                </text>
                <text x="40" y="125" fill="#9ca3af" fontSize="12">
                  50
                </text>
                <text x="40" y="175" fill="#9ca3af" fontSize="12">
                  25
                </text>
                <text x="40" y="225" fill="#9ca3af" fontSize="12">
                  0
                </text>

                {/* Y-axis title */}
                <text
                  x="20"
                  y="150"
                  fill="#9ca3af"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Score (%)
                </text>

                {/* X-axis labels */}
                {trainingData.alignment.weekly_scores.map((week, index) => {
                  const x = 120 + index * 140;
                  const date = new Date(week.week_start);
                  const label =
                    viewMode === "weekly"
                      ? `${date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`
                      : `${date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "2-digit",
                        })}`;

                  return (
                    <text
                      key={`x-label-${index}`}
                      x={x}
                      y="280"
                      fill="#9ca3af"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  );
                })}

                {/* X-axis title */}
                <text
                  x="450"
                  y="295"
                  fill="#9ca3af"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {viewMode === "weekly" ? "Week Starting" : "Month"}
                </text>

                {/* Training Load Line */}
                {trainingData.alignment.weekly_scores.map((week, index) => {
                  const x = 120 + index * 140;
                  const y = 240 - week.training_load_score * 2.4;
                  const nextWeek =
                    trainingData.alignment?.weekly_scores?.[index + 1];

                  return (
                    <g key={`load-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {nextWeek && (
                        <line
                          x1={x}
                          y1={y}
                          x2={120 + (index + 1) * 140}
                          y2={240 - nextWeek.training_load_score * 2.4}
                          stroke="#3b82f6"
                          strokeWidth="3"
                        />
                      )}
                      {/* Value label */}
                      <text
                        x={x}
                        y={y - 15}
                        fill="#3b82f6"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {week.training_load_score}
                      </text>
                    </g>
                  );
                })}

                {/* Recovery Score Line */}
                {trainingData.alignment.weekly_scores.map((week, index) => {
                  const x = 120 + index * 140;
                  const y = 240 - week.recovery_score * 2.4;
                  const nextWeek =
                    trainingData.alignment?.weekly_scores?.[index + 1];

                  return (
                    <g key={`recovery-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {nextWeek && (
                        <line
                          x1={x}
                          y1={y}
                          x2={120 + (index + 1) * 140}
                          y2={240 - nextWeek.recovery_score * 2.4}
                          stroke="#10b981"
                          strokeWidth="3"
                        />
                      )}
                      {/* Value label */}
                      <text
                        x={x}
                        y={y - 15}
                        fill="#10b981"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {week.recovery_score}
                      </text>
                    </g>
                  );
                })}

                {/* Mismatch Markers */}
                {trainingData.mismatch?.weekly_mismatches?.map(
                  (mismatch, index) => {
                    const weekIndex =
                      trainingData.alignment?.weekly_scores?.findIndex(
                        (w) => w.week_start === mismatch.week_start
                      );
                    if (weekIndex !== undefined && weekIndex >= 0) {
                      const x = 120 + weekIndex * 140;
                      return (
                        <g key={`mismatch-${index}`}>
                          <rect
                            x={x - 25}
                            y="15"
                            width="50"
                            height="25"
                            fill="#ef4444"
                            rx="3"
                          />
                          <text
                            x={x}
                            y="30"
                            fill="white"
                            fontSize="12"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            !
                          </text>
                        </g>
                      );
                    }
                    return null;
                  }
                )}

                {/* Legend */}
                <g transform="translate(700, 20)">
                  <circle
                    cx="10"
                    cy="15"
                    r="5"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x="20"
                    y="20"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Training Load
                  </text>
                  <circle
                    cx="10"
                    cy="40"
                    r="5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x="20"
                    y="45"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Recovery Score
                  </text>
                  <rect
                    x="0"
                    y="55"
                    width="20"
                    height="15"
                    fill="#ef4444"
                    rx="3"
                  />
                  <text
                    x="25"
                    y="67"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Mismatch Alert
                  </text>
                </g>
              </svg>
            </div>
          </div>
        )}

      {/* 2. Recovery Efficiency Tracker */}
      {trainingData.recovery?.rest_days &&
        trainingData.recovery.rest_days.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Recovery Efficiency Tracker (
              {viewMode === "weekly" ? "Weekly" : "Monthly"} View)
            </h3>
            <div className="relative h-80 w-full">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 900 300"
                className="overflow-x-auto"
              >
                {/* Grid */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Y-axis labels */}
                <text
                  x="40"
                  y="25"
                  fill="#9ca3af"
                  fontSize="12"
                  fontWeight="bold"
                >
                  100
                </text>
                <text x="40" y="75" fill="#9ca3af" fontSize="12">
                  75
                </text>
                <text x="40" y="125" fill="#9ca3af" fontSize="12">
                  50
                </text>
                <text x="40" y="175" fill="#9ca3af" fontSize="12">
                  25
                </text>
                <text x="40" y="225" fill="#9ca3af" fontSize="12">
                  0
                </text>

                {/* Y-axis title */}
                <text
                  x="20"
                  y="150"
                  fill="#9ca3af"
                  fontSize="14"
                  fontWeight="bold"
                  transform="rotate(-90, 20, 150)"
                >
                  Efficiency (%)
                </text>

                {/* X-axis labels */}
                {trainingData.recovery.rest_days.map((day, index) => {
                  const x = 120 + index * 120;
                  const date = new Date(day.date);
                  const label =
                    viewMode === "weekly"
                      ? `${date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`
                      : `${date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "2-digit",
                        })}`;

                  return (
                    <text
                      key={`x-label-${index}`}
                      x={x}
                      y="280"
                      fill="#9ca3af"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  );
                })}

                {/* X-axis title */}
                <text
                  x="450"
                  y="295"
                  fill="#9ca3af"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {viewMode === "weekly" ? "Rest Day" : "Month"}
                </text>

                {/* Efficiency Bars */}
                {trainingData.recovery.rest_days.map((day, index) => {
                  const x = 120 + index * 120;
                  const height = day.recovery_efficiency * 2.4;
                  const y = 240 - height;
                  const color =
                    day.recovery_efficiency >= 70
                      ? "#10b981"
                      : day.recovery_efficiency >= 50
                      ? "#f59e0b"
                      : "#ef4444";

                  return (
                    <g key={`efficiency-${index}`}>
                      <rect
                        x={x - 25}
                        y={y}
                        width="50"
                        height={height}
                        fill={color}
                        rx="4"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={y - 10}
                        fill={color}
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {day.recovery_efficiency}
                      </text>
                    </g>
                  );
                })}

                {/* Average Line */}
                <line
                  x1="100"
                  y1={
                    240 -
                    (trainingData.recovery?.summary?.average_efficiency || 0) *
                      2.4
                  }
                  x2="800"
                  y2={
                    240 -
                    (trainingData.recovery?.summary?.average_efficiency || 0) *
                      2.4
                  }
                  stroke="#6b7280"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                />
                <text
                  x="820"
                  y={
                    240 -
                    (trainingData.recovery?.summary?.average_efficiency || 0) *
                      2.4
                  }
                  fill="#6b7280"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Avg:{" "}
                  {trainingData.recovery?.summary?.average_efficiency?.toFixed(
                    1
                  )}
                  %
                </text>

                {/* Legend */}
                <g transform="translate(700, 20)">
                  <rect
                    x="0"
                    y="0"
                    width="15"
                    height="15"
                    fill="#10b981"
                    rx="2"
                  />
                  <text
                    x="20"
                    y="12"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Excellent (≥70%)
                  </text>
                  <rect
                    x="0"
                    y="20"
                    width="15"
                    height="15"
                    fill="#f59e0b"
                    rx="2"
                  />
                  <text
                    x="20"
                    y="32"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Good (50-69%)
                  </text>
                  <rect
                    x="0"
                    y="40"
                    width="15"
                    height="15"
                    fill="#ef4444"
                    rx="2"
                  />
                  <text
                    x="20"
                    y="52"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Poor (&lt;50%)
                  </text>
                </g>
              </svg>
            </div>
          </div>
        )}

      {/* 3. Burnout Forecast */}
      {trainingData.alignment?.weekly_scores &&
        trainingData.alignment.weekly_scores.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Burnout Forecast ({viewMode === "weekly" ? "Weekly" : "Monthly"}{" "}
              View)
            </h3>
            <div className="relative h-80 w-full">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 900 300"
                className="overflow-x-auto"
              >
                {/* Grid */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Risk Zones */}
                <rect
                  x="100"
                  y="0"
                  width="700"
                  height="60"
                  fill="#ef4444"
                  opacity="0.1"
                />
                <rect
                  x="100"
                  y="60"
                  width="700"
                  height="60"
                  fill="#f59e0b"
                  opacity="0.1"
                />
                <rect
                  x="100"
                  y="120"
                  width="700"
                  height="180"
                  fill="#10b981"
                  opacity="0.1"
                />

                {/* Zone Labels */}
                <text
                  x="820"
                  y="35"
                  fill="#ef4444"
                  fontSize="12"
                  fontWeight="bold"
                >
                  High Risk
                </text>
                <text
                  x="820"
                  y="95"
                  fill="#f59e0b"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Moderate
                </text>
                <text
                  x="820"
                  y="210"
                  fill="#10b981"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Low Risk
                </text>

                {/* Y-axis labels */}
                <text
                  x="40"
                  y="25"
                  fill="#9ca3af"
                  fontSize="12"
                  fontWeight="bold"
                >
                  100
                </text>
                <text x="40" y="75" fill="#9ca3af" fontSize="12">
                  75
                </text>
                <text x="40" y="125" fill="#9ca3af" fontSize="12">
                  50
                </text>
                <text x="40" y="175" fill="#9ca3af" fontSize="12">
                  25
                </text>
                <text x="40" y="225" fill="#9ca3af" fontSize="12">
                  0
                </text>

                {/* Y-axis title */}
                <text
                  x="20"
                  y="150"
                  fill="#9ca3af"
                  fontSize="14"
                  fontWeight="bold"
                  transform="rotate(-90, 20, 150)"
                >
                  Fatigue Score
                </text>

                {/* X-axis labels */}
                {trainingData.alignment.weekly_scores.map((week, index) => {
                  const x = 120 + index * 140;
                  const date = new Date(week.week_start);
                  const label =
                    viewMode === "weekly"
                      ? `${date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`
                      : `${date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "2-digit",
                        })}`;

                  return (
                    <text
                      key={`x-label-${index}`}
                      x={x}
                      y="280"
                      fill="#9ca3af"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  );
                })}

                {/* X-axis title */}
                <text
                  x="450"
                  y="295"
                  fill="#9ca3af"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {viewMode === "weekly" ? "Week Starting" : "Month"}
                </text>

                {/* Fatigue Score Line */}
                {trainingData.alignment.weekly_scores.map((week, index) => {
                  const x = 120 + index * 140;
                  // Calculate fatigue score based on load/recovery mismatch
                  const fatigueScore = Math.max(
                    0,
                    week.training_load_score - week.recovery_score
                  );
                  const y = 240 - fatigueScore * 2.4;
                  const nextWeek =
                    trainingData.alignment?.weekly_scores?.[index + 1];

                  return (
                    <g key={`fatigue-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {nextWeek && (
                        <line
                          x1={x}
                          y1={y}
                          x2={120 + (index + 1) * 140}
                          y2={
                            240 -
                            Math.max(
                              0,
                              nextWeek.training_load_score -
                                nextWeek.recovery_score
                            ) *
                              2.4
                          }
                          stroke="#8b5cf6"
                          strokeWidth="3"
                        />
                      )}
                      {/* Value label */}
                      <text
                        x={x}
                        y={y - 15}
                        fill="#8b5cf6"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {fatigueScore}
                      </text>
                    </g>
                  );
                })}

                {/* Forecast Line (dashed) */}
                <line
                  x1="700"
                  y1="150"
                  x2="800"
                  y2="120"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                />
                <text
                  x="820"
                  y="125"
                  fill="#8b5cf6"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Forecast
                </text>

                {/* Legend */}
                <g transform="translate(700, 20)">
                  <circle
                    cx="10"
                    cy="15"
                    r="5"
                    fill="#8b5cf6"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x="20"
                    y="20"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Fatigue Score
                  </text>
                  <line
                    x1="0"
                    y1="30"
                    x2="20"
                    y2="30"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                  />
                  <text
                    x="25"
                    y="35"
                    fill="#9ca3af"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    Trend
                  </text>
                </g>
              </svg>
            </div>
          </div>
        )}

      {/* Summary Stats */}
      {(trainingData.alignment?.weekly_scores?.length || 0) > 0 ||
      (trainingData.mismatch?.weekly_mismatches?.length || 0) > 0 ||
      (trainingData.recovery?.rest_days?.length || 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400">
              Average Alignment
            </h4>
            <p className="text-2xl font-bold text-white">
              {trainingData.alignment?.summary?.average_alignment?.toFixed(1) ||
                "N/A"}
              %
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400">
              Mismatches Detected
            </h4>
            <p className="text-2xl font-bold text-red-400">
              {trainingData.mismatch?.summary?.total_mismatches || 0}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400">
              Avg Recovery Efficiency
            </h4>
            <p className="text-2xl font-bold text-green-400">
              {trainingData.recovery?.summary?.average_efficiency?.toFixed(1) ||
                "N/A"}
              %
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
