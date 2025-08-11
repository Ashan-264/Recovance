"use client";

import React, { useState, useEffect } from "react";
import ChartLine from "./ChartLine";

interface OuraSleepData {
  id: string;
  day: string;
  total_sleep_duration: number;
  deep_sleep_duration?: number;
  rem_sleep_duration?: number;
  light_sleep_duration?: number;
  awake_time?: number;
  time_in_bed?: number;
  efficiency?: number;
  average_heart_rate?: number;
  average_hrv?: number;
}

interface OuraActivityData {
  day: string;
  active_calories?: number;
}

interface OuraStressData {
  day: string;
  stress_high?: number; // in seconds
}

interface OuraInsightsProps {
  startDate: string;
  endDate: string;
}

export default function OuraInsights({
  startDate,
  endDate,
}: OuraInsightsProps) {
  const [sleepData, setSleepData] = useState<OuraSleepData[]>([]);
  const [activityData, setActivityData] = useState<OuraActivityData[]>([]);
  const [stressData, setStressData] = useState<OuraStressData[]>([]);
  const [loading, setLoading] = useState(false);

  // Remove auto-loading - data will be fetched when component mounts only if manually triggered
  // useEffect(() => {
  //   fetchOuraData();
  // }, [startDate, endDate]);

  const fetchOuraData = async () => {
    setLoading(true);
    try {
      // Fetch sleep data with total_sleep_duration from detailed endpoint
      const sleepResponse = await fetch("/api/sleep/sleep_detail_days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      // Fetch activity data
      const activityResponse = await fetch("/api/oura/daily_activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      // Fetch stress data
      const stressResponse = await fetch("/api/oura/daily_stress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      if (sleepResponse.ok) {
        const sleepResult = await sleepResponse.json();
        console.log("Sleep API response:", sleepResult);
        console.log("Sleep data count:", (sleepResult.data || []).length);
        if (sleepResult.data && sleepResult.data.length > 0) {
          console.log("First sleep record:", sleepResult.data[0]);
          console.log(
            "Total sleep duration of first record:",
            sleepResult.data[0].total_sleep_duration
          );
        }

        // Aggregate sleep data by day (multiple sleep sessions per day)
        const aggregatedSleepData = aggregateSleepByDay(sleepResult.data || []);
        console.log("Aggregated sleep data count:", aggregatedSleepData.length);
        if (aggregatedSleepData.length > 0) {
          console.log("First aggregated sleep record:", aggregatedSleepData[0]);
        }
        setSleepData(aggregatedSleepData);
      } else {
        console.error(
          "Sleep API failed:",
          sleepResponse.status,
          sleepResponse.statusText
        );
      }

      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        setActivityData(activityResult.data || []);
      }

      if (stressResponse.ok) {
        const stressResult = await stressResponse.json();
        setStressData(stressResult.data || []);
      }
    } catch (error) {
      console.error("Error fetching Oura data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatStressMinutes = (seconds: number) => {
    return Math.round(seconds / 60);
  };

  const formatSleepHours = (seconds: number) => {
    return (seconds / 3600).toFixed(1);
  };

  // Aggregate sleep data by day (combine multiple sleep sessions per day)
  const aggregateSleepByDay = (rawSleepData: any[]) => {
    const dailyAggregates: { [key: string]: OuraSleepData } = {};

    rawSleepData.forEach((session) => {
      const day = session.day;

      if (!dailyAggregates[day]) {
        dailyAggregates[day] = {
          id: session.id,
          day: day,
          total_sleep_duration: 0,
          deep_sleep_duration: 0,
          rem_sleep_duration: 0,
          light_sleep_duration: 0,
          awake_time: 0,
          time_in_bed: 0,
          efficiency: 0,
          average_heart_rate: 0,
          average_hrv: 0,
        };
      }

      // Aggregate durations
      dailyAggregates[day].total_sleep_duration +=
        session.total_sleep_duration || 0;
      dailyAggregates[day].deep_sleep_duration! +=
        session.deep_sleep_duration || 0;
      dailyAggregates[day].rem_sleep_duration! +=
        session.rem_sleep_duration || 0;
      dailyAggregates[day].light_sleep_duration! +=
        session.light_sleep_duration || 0;
      dailyAggregates[day].awake_time! += session.awake_time || 0;
      dailyAggregates[day].time_in_bed! += session.time_in_bed || 0;

      // For averages, we'll take the last session's values for now
      // (could be improved to calculate weighted averages)
      dailyAggregates[day].efficiency = session.efficiency || 0;
      dailyAggregates[day].average_heart_rate = session.average_heart_rate || 0;
      dailyAggregates[day].average_hrv = session.average_hrv || 0;
    });

    // Convert to array and sort by date
    return Object.values(dailyAggregates).sort(
      (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
    );
  };

  const createLineChart = (
    data: any[],
    valueKey: string,
    color: string,
    formatValue: (val: number) => string,
    yAxisLabel: string
  ) => {
    if (data.length === 0)
      return (
        <div className="text-gray-400 text-center py-8">No data available</div>
      );

    // Trim leading and trailing zero-value points to avoid center clustering
    let start = 0;
    let end = data.length - 1;
    while (start < data.length && (data[start][valueKey] || 0) === 0) start++;
    while (end > start && (data[end][valueKey] || 0) === 0) end--;
    const chartData = data.slice(start, end + 1);

    const values = chartData.map((d) => d[valueKey] || 0).filter((v) => v > 0);
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
        const value = item[valueKey] || 0;
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
              const value = item[valueKey] || 0;
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
                  <title>{`${formatValue(value)} on ${formatDate(
                    item.day
                  )}`}</title>
                </circle>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            {chartData.map((item, index) => (
              <div key={index} className="text-center">
                {formatDate(item.day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const createBarChart = (
    data: any[],
    valueKey: string,
    color: string,
    formatValue: (val: number) => string,
    yAxisLabel: string
  ) => {
    if (data.length === 0)
      return (
        <div className="text-gray-400 text-center py-8">No data available</div>
      );

    const values = data.map((d) => d[valueKey] || 0).filter((v) => v > 0);
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
                const value = item[valueKey] || 0;
                const height =
                  effectiveMax > 0 ? (value / effectiveMax) * 100 : 0;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="w-3 rounded-t transition-all duration-200 hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        backgroundColor: color,
                        minHeight: "4px",
                      }}
                      title={`${formatValue(value)} on ${formatDate(item.day)}`}
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
                {formatDate(item.day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Add load data button at the top
  if (loading) {
    return (
      <div className="bg-[#1e2a28] p-6 rounded-lg border border-[#3b5450]">
        <div className="text-center text-gray-400">
          Loading Oura insights...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Load Data Button */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <button
          onClick={fetchOuraData}
          disabled={loading}
          className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Oura Data"}
        </button>
      </div>

      <h3 className="text-lg font-bold text-white mb-4">Oura Insights</h3>

      {/* Stress Levels Trend */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h4 className="text-md font-semibold text-white mb-2">
          Stress Levels (Minutes/Day)
        </h4>
        <div className="text-sm text-gray-400 mb-2">
          {stressData.length > 0 && (
            <span>
              Average:{" "}
              {(() => {
                const validStressData = stressData.filter(
                  (d) => (d.stress_high || 0) > 0
                );
                if (validStressData.length === 0) return "No data";
                const avgStress =
                  validStressData.reduce(
                    (sum, d) => sum + (d.stress_high || 0),
                    0
                  ) / validStressData.length;
                return `${formatStressMinutes(avgStress)} min/day (${
                  validStressData.length
                } days)`;
              })()}
            </span>
          )}
        </div>
        {stressData.length > 0 ? (
          <ChartLine
            labels={stressData.map((d) => formatDate(d.day))}
            values={stressData.map((d) =>
              formatStressMinutes(d.stress_high || 0)
            )}
            color="#ef4444"
            label="Stress (min)"
          />
        ) : (
          <div className="text-gray-400 text-center py-8">
            No data available
          </div>
        )}
      </div>

      {/* Active Calories Trend */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h4 className="text-md font-semibold text-white mb-2">
          Active Calories Burned
        </h4>
        <div className="text-sm text-gray-400 mb-2">
          {activityData.length > 0 && (
            <span>
              Average:{" "}
              {(() => {
                const validActivityData = activityData.filter(
                  (d) => (d.active_calories || 0) > 0
                );
                if (validActivityData.length === 0) return "No data";
                const avgCalories =
                  validActivityData.reduce(
                    (sum, d) => sum + (d.active_calories || 0),
                    0
                  ) / validActivityData.length;
                return `${Math.round(avgCalories)} cal/day (${
                  validActivityData.length
                } days)`;
              })()}
            </span>
          )}
        </div>
        {activityData.length > 0 ? (
          <ChartLine
            labels={activityData.map((d) => formatDate(d.day))}
            values={activityData.map((d) => d.active_calories || 0)}
            color="#0cf2d0"
            label="Active Calories"
          />
        ) : (
          <div className="text-gray-400 text-center py-8">
            No data available
          </div>
        )}
      </div>

      {/* Sleep Trend */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h4 className="text-md font-semibold text-white mb-2">
          Sleep Duration (Hours)
        </h4>
        <div className="text-sm text-gray-400 mb-2">
          {sleepData.length > 0 && (
            <span>
              Average:{" "}
              {(() => {
                const validSleepData = sleepData.filter(
                  (d) => (d.total_sleep_duration || 0) > 0
                );
                if (validSleepData.length === 0) return "No data";
                const avgSleep =
                  validSleepData.reduce(
                    (sum, d) => sum + (d.total_sleep_duration || 0),
                    0
                  ) / validSleepData.length;
                return `${formatSleepHours(avgSleep)} hours (${
                  validSleepData.length
                } days)`;
              })()}
            </span>
          )}
          {sleepData.length === 0 && (
            <span>
              No sleep data loaded. Click "Load Oura Data" button above.
            </span>
          )}
        </div>
        {sleepData.length > 0 ? (
          <ChartLine
            labels={sleepData.map((d) => formatDate(d.day))}
            values={sleepData.map((d) =>
              parseFloat(formatSleepHours(d.total_sleep_duration || 0))
            )}
            color="#3b82f6"
            label="Sleep Hours"
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
