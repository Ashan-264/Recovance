"use client";

import React, { useState, useEffect } from "react";
import ChartLine from "./ChartLine";

interface StravaActivity {
  id: number;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
  upload_id?: number;
  external_id?: string;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id?: string;
  start_latlng?: number[];
  end_latlng?: number[];
  average_temp?: number;
  average_grade_adjusted_speed?: number;
  average_grade?: number;
  positive_elevation_gain?: number;
  negative_elevation_gain?: number;
  calories?: number;
  description?: string;
  photos?: any;
  gear?: any;
  device_name?: string;
  embed_token?: string;
  splits_metric?: any[];
  splits_standard?: any[];
  laps?: any[];
  best_efforts?: any[];
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map?: any;
  has_kudoed: boolean;
  hide_from_home: boolean;
  workout_type?: number;
  suffer_score?: number;
}

interface StravaInsightsProps {
  startDate: string;
  endDate: string;
  stravaToken: string;
}

interface WeeklyData {
  week: string;
  totalMinutes: number;
  avgHeartRate: number;
  activityCount: number;
}

export default function StravaInsights({
  startDate,
  endDate,
  stravaToken,
}: StravaInsightsProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(false);

  // Remove auto-loading - data will be fetched when component mounts only if manually triggered
  // useEffect(() => {
  //   if (stravaToken) {
  //     fetchStravaData();
  //   }
  // }, [startDate, endDate, stravaToken]);

  const fetchStravaData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/strava/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: stravaToken,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        processWeeklyData(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching Strava data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyData = (activities: StravaActivity[]) => {
    const weeklyMap = new Map<
      string,
      { minutes: number; heartRates: number[]; count: number }
    >();

    activities.forEach((activity) => {
      const activityDate = new Date(activity.start_date);
      const weekStart = new Date(activityDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split("T")[0];

      const existing = weeklyMap.get(weekKey) || {
        minutes: 0,
        heartRates: [],
        count: 0,
      };
      existing.minutes += activity.moving_time / 60; // Convert to minutes
      if (activity.average_heartrate) {
        existing.heartRates.push(activity.average_heartrate);
      }
      existing.count += 1;
      weeklyMap.set(weekKey, existing);
    });

    const weeklyArray: WeeklyData[] = Array.from(weeklyMap.entries()).map(
      ([week, data]) => ({
        week,
        totalMinutes: Math.round(data.minutes),
        avgHeartRate:
          data.heartRates.length > 0
            ? Math.round(
                data.heartRates.reduce((sum, hr) => sum + hr, 0) /
                  data.heartRates.length
              )
            : 0,
        activityCount: data.count,
      })
    );

    // Sort by week
    weeklyArray.sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()
    );
    setWeeklyData(weeklyArray);
  };

  const formatWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const createBarChart = (
    data: WeeklyData[],
    valueKey: keyof WeeklyData,
    color: string,
    label: string,
    formatValue: (val: number) => string
  ) => {
    if (data.length === 0)
      return (
        <div className="text-gray-400 text-center py-8">No data available</div>
      );

    const values = data.map((d) => d[valueKey] as number).filter((v) => v > 0);
    const maxValue = values.length > 0 ? Math.max(...values) : 0;

    // If all values are zero, use a small range for better visualization
    let effectiveMax = maxValue;
    if (maxValue === 0) {
      effectiveMax = 1;
    } else {
      // Add some padding to the range for better visualization
      effectiveMax = maxValue * 1.1;
    }

    // Generate Y-axis labels
    const yAxisLabels = [];
    const numLabels = 5;
    for (let i = 0; i <= numLabels; i++) {
      const value = (effectiveMax * i) / numLabels;
      yAxisLabels.push(formatValue(value));
    }

    return (
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400">
          {yAxisLabels.reverse().map((label, index) => (
            <div key={index} className="text-right pr-2">
              {label}
            </div>
          ))}
        </div>

        {/* Chart container with padding for Y-axis */}
        <div className="ml-12">
          <div className="relative h-24 mt-4">
            {/* Grid lines */}
            {yAxisLabels.map((_, index) => {
              const y = (index / (yAxisLabels.length - 1)) * 100;
              return (
                <div
                  key={index}
                  className="absolute left-0 right-0 border-t border-[#3b5450] opacity-30"
                  style={{ top: `${y}%` }}
                />
              );
            })}

            {/* Bars */}
            <div className="flex items-end justify-between h-full px-2">
              {data.map((item, index) => {
                const value = item[valueKey] as number;
                const height =
                  effectiveMax > 0 ? (value / effectiveMax) * 100 : 0;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="w-4 rounded-t transition-all duration-200 hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        backgroundColor: color,
                        minHeight: "4px",
                      }}
                      title={`${formatValue(value)} for week of ${formatWeek(
                        item.week
                      )}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            {data.map((item, index) => (
              <div key={index} className="text-center">
                {formatWeek(item.week)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const createLineChart = (
    data: WeeklyData[],
    valueKey: keyof WeeklyData,
    color: string,
    label: string,
    formatValue: (val: number) => string
  ) => {
    if (data.length === 0)
      return (
        <div className="text-gray-400 text-center py-8">No data available</div>
      );

    // Trim leading/trailing zero-value weeks to avoid clustering
    let s = 0;
    let e = data.length - 1;
    while (s < data.length && (data[s][valueKey] as number) === 0) s++;
    while (e > s && (data[e][valueKey] as number) === 0) e--;
    const chartData = data.slice(s, e + 1);

    const values = chartData
      .map((d) => d[valueKey] as number)
      .filter((v) => v > 0);
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const minValue = values.length > 0 ? Math.min(...values) : 0;

    // If all values are zero, use a small range for better visualization
    let range = maxValue - minValue;
    let effectiveMax = maxValue;
    let effectiveMin = minValue;

    if (range === 0) {
      if (maxValue === 0) {
        // All values are zero, use a small range
        effectiveMax = 1;
        effectiveMin = 0;
        range = 1;
      } else {
        // All values are the same non-zero value
        effectiveMax = maxValue * 1.1;
        effectiveMin = 0;
        range = effectiveMax;
      }
    } else {
      // Add some padding to the range for better visualization
      const padding = range * 0.1;
      effectiveMax = maxValue + padding;
      effectiveMin = Math.max(0, minValue - padding);
      range = effectiveMax - effectiveMin;
    }

    // Generate Y-axis labels
    const yAxisLabels = [];
    const numLabels = 5;
    for (let i = 0; i <= numLabels; i++) {
      const value = effectiveMin + (range * i) / numLabels;
      yAxisLabels.push(formatValue(value));
    }

    const points = chartData
      .map((item, index) => {
        const value = item[valueKey] as number;
        const percentage =
          range > 0 ? ((value - effectiveMin) / range) * 100 : 50;
        const x = (index / (chartData.length - 1)) * 100;
        const y = 100 - percentage;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400">
          {yAxisLabels.reverse().map((label, index) => (
            <div key={index} className="text-right pr-2">
              {label}
            </div>
          ))}
        </div>

        {/* Chart container with padding for Y-axis */}
        <div className="ml-12">
          <svg width="100%" height="120" viewBox="0 0 100 100" className="mt-4">
            {/* Grid lines */}
            {yAxisLabels.map((_, index) => {
              const y = (index / (yAxisLabels.length - 1)) * 100;
              return (
                <line
                  key={index}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#3b5450"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              );
            })}

            {/* Chart line */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={points}
            />

            {/* Data points */}
            {chartData.map((item, index) => {
              const value = item[valueKey] as number;
              const percentage =
                range > 0 ? ((value - effectiveMin) / range) * 100 : 50;
              const x = (index / (chartData.length - 1)) * 100;
              const y = 100 - percentage;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                  stroke="#111817"
                  strokeWidth="1"
                >
                  <title>{`${formatValue(value)} for week of ${formatWeek(
                    item.week
                  )}`}</title>
                </circle>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            {chartData.map((item, index) => (
              <div key={index} className="text-center">
                {formatWeek(item.week)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!stravaToken) {
    return (
      <div className="bg-[#1e2a28] p-6 rounded-lg border border-[#3b5450]">
        <div className="text-center text-gray-400">
          Please enter your Strava access token to view insights
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#1e2a28] p-6 rounded-lg border border-[#3b5450]">
        <div className="text-center text-gray-400">
          Loading Strava insights...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Load Data Button */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <button
          onClick={fetchStravaData}
          disabled={loading || !stravaToken}
          className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Strava Data"}
        </button>
      </div>

      <h3 className="text-lg font-bold text-white mb-4">Strava Insights</h3>

      {/* Activity Minutes Trend */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h4 className="text-md font-semibold text-white mb-2">
          Activity Minutes per Week
        </h4>
        <div className="text-sm text-gray-400 mb-2">
          {weeklyData.length > 0 && (
            <span>
              Average:{" "}
              {Math.round(
                weeklyData.reduce((sum, d) => sum + d.totalMinutes, 0) /
                  weeklyData.length
              )}{" "}
              min/week
            </span>
          )}
        </div>
        {weeklyData.length > 0 ? (
          <ChartLine
            labels={weeklyData.map((d) => formatWeek(d.week))}
            values={weeklyData.map((d) => d.totalMinutes)}
            color="#0cf2d0"
            label="Minutes"
          />
        ) : (
          <div className="text-gray-400 text-center py-8">
            No data available
          </div>
        )}
      </div>

      {/* Average Heart Rate Trend */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h4 className="text-md font-semibold text-white mb-2">
          Average Heart Rate per Week
        </h4>
        <div className="text-sm text-gray-400 mb-2">
          {weeklyData.length > 0 && (
            <span>
              Average:{" "}
              {Math.round(
                weeklyData.reduce((sum, d) => sum + d.avgHeartRate, 0) /
                  weeklyData.length
              )}{" "}
              bpm
            </span>
          )}
        </div>
        {weeklyData.length > 0 ? (
          <ChartLine
            labels={weeklyData.map((d) => formatWeek(d.week))}
            values={weeklyData.map((d) => d.avgHeartRate)}
            color="#ef4444"
            label="Heart Rate (bpm)"
          />
        ) : (
          <div className="text-gray-400 text-center py-8">
            No data available
          </div>
        )}
      </div>

      {/* Activity Count Trend */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h4 className="text-md font-semibold text-white mb-2">
          Activities per Week
        </h4>
        <div className="text-sm text-gray-400 mb-2">
          {weeklyData.length > 0 && (
            <span>
              Average:{" "}
              {(
                weeklyData.reduce((sum, d) => sum + d.activityCount, 0) /
                weeklyData.length
              ).toFixed(1)}{" "}
              activities/week
            </span>
          )}
        </div>
        {weeklyData.length > 0 ? (
          <ChartLine
            labels={weeklyData.map((d) => formatWeek(d.week))}
            values={weeklyData.map((d) => d.activityCount)}
            color="#3b82f6"
            label="Activities"
          />
        ) : (
          <div className="text-gray-400 text-center py-8">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
