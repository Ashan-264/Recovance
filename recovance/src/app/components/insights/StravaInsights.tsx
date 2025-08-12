"use client";

import React, { useState } from "react";
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
  photos?: unknown;
  gear?: unknown;
  device_name?: string;
  embed_token?: string;
  splits_metric?: unknown[];
  splits_standard?: unknown[];
  laps?: unknown[];
  best_efforts?: unknown[];
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map?: unknown;
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
