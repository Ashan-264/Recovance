"use client";

import React, { useState } from "react";
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
  const aggregateSleepByDay = (rawSleepData: OuraSleepData[]) => {
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
              No sleep data loaded. Click &quot;Load Oura Data&quot; button
              above.
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
