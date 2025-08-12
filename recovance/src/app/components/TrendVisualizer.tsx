"use client";

// components/TrendVisualizer.tsx
import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import { useStrava } from "@/app/contexts/StravaContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TrendData {
  date: string;
  activityMinutes: number;
  readinessScore: number;
  sleepScore: number;
}

interface StravaActivity {
  id?: number;
  name?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  type?: string;
  sport_type?: string;
  start_date?: string;
  start_date_local?: string;
  timezone?: string;
  utc_offset?: number;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  achievement_count?: number;
  kudos_count?: number;
  comment_count?: number;
  athlete_count?: number;
  photo_count?: number;
  map?: {
    id?: string;
    summary_polyline?: string;
    resource_state?: number;
  };
  trainer?: boolean;
  commute?: boolean;
  manual?: boolean;
  private?: boolean;
  visibility?: string;
  flagged?: boolean;
  gear_id?: string;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  average_speed?: number;
  max_speed?: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  has_heartrate?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out?: boolean;
  display_hide_heartrate_option?: boolean;
  elev_high?: number;
  elev_low?: number;
  upload_id?: number;
  upload_id_str?: string;
  external_id?: string;
  from_accepted_tag?: boolean;
  pr_count?: number;
  total_photo_count?: number;
  has_kudoed?: boolean;
  workout_type?: number;
  suffer_score?: number;
  description?: string;
  calories?: number;
  perceived_exertion?: number;
  prefer_perceived_exertion?: boolean;
  segment_efforts?: unknown[];
  splits_metric?: unknown[];
  splits_standard?: unknown[];
  laps?: unknown[];
  gear?: unknown;
  partner_brand_tag?: unknown;
  photos?: {
    primary?: unknown;
    use_primary_photo?: boolean;
    count?: number;
  };
  highlighted_kudosers?: unknown[];
  hide_from_home?: boolean;
  device_name?: string;
  embed_token?: string;
  segment_leaderboard_opt_out?: boolean;
  leaderboard_opt_out?: boolean;
}

interface OuraReadinessData {
  id?: string;
  day?: string;
  score?: number;
  temperature_deviation?: number;
  temperature_trend_deviation?: number;
  contributors?: Record<string, number>;
}

interface OuraSleepData {
  id?: string;
  day?: string;
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

export default function TrendVisualizer() {
  const { getStravaToken, hasValidToken } = useStrava();
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Generate date range for last 14 days
  const getLast14Days = () => {
    const dates = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  };

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      const dates = getLast14Days();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      // Fetch Strava data
      let stravaActivities: StravaActivity[] = [];
      const stravaToken = getStravaToken();

      if (stravaToken) {
        try {
          const stravaResponse = await fetch("/api/strava/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: stravaToken,
              start_date: startDate,
              end_date: endDate,
            }),
          });
          if (stravaResponse.ok) {
            const stravaData = await stravaResponse.json();
            stravaActivities = stravaData.activities || [];
          }
        } catch (error) {
          console.warn("Failed to fetch Strava data:", error);
        }
      }

      // Fetch Oura readiness data
      let ouraReadiness: OuraReadinessData[] = [];
      try {
        const readinessResponse = await fetch("/api/sleep/readiness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_date: startDate, end_date: endDate }),
        });
        if (readinessResponse.ok) {
          const readinessData = await readinessResponse.json();
          ouraReadiness = readinessData.data || [];
        }
      } catch (error) {
        console.warn("Failed to fetch Oura readiness data:", error);
      }

      // Fetch Oura sleep scores
      let ouraSleep: OuraSleepData[] = [];
      try {
        const sleepResponse = await fetch("/api/sleep/oura", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_date: startDate, end_date: endDate }),
        });
        if (sleepResponse.ok) {
          const sleepData = await sleepResponse.json();
          ouraSleep = sleepData.data || [];
        }
      } catch (error) {
        console.warn("Failed to fetch Oura sleep data:", error);
      }

      // Process and combine data
      const processedData: TrendData[] = dates.map((date) => {
        // Calculate activity minutes for this date
        const dayActivities = stravaActivities.filter(
          (activity: StravaActivity) =>
            activity.start_date_local?.startsWith(date)
        );
        const activityMinutes = dayActivities.reduce(
          (sum: number, activity: StravaActivity) =>
            sum + (activity.moving_time || 0) / 60,
          0
        );

        // Get readiness score for this date
        const readinessEntry = ouraReadiness.find(
          (entry: OuraReadinessData) => entry.day === date
        );
        const readinessScore = readinessEntry?.score || 0;

        // Get sleep score for this date
        const sleepEntry = ouraSleep.find(
          (entry: OuraSleepData) => entry.day === date
        );
        const sleepScore = sleepEntry?.score || 0;

        return {
          date,
          activityMinutes: Math.round(activityMinutes),
          readinessScore,
          sleepScore,
        };
      });

      setTrendData(processedData);
    } catch (error) {
      console.error("Error fetching trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart configuration
  const chartData = {
    labels: trendData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      });
    }),
    datasets: [
      {
        label: "Activity Minutes",
        data: trendData.map((d) => d.activityMinutes),
        borderColor: "#0cf2d0",
        backgroundColor: "rgba(12, 242, 208, 0.1)",
        tension: 0.3,
        yAxisID: "y",
      },
      {
        label: "Readiness Score",
        data: trendData.map((d) => d.readinessScore),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
        yAxisID: "y1",
      },
      {
        label: "Sleep Score",
        data: trendData.map((d) => d.sleepScore),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        tension: 0.3,
        yAxisID: "y1",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: true,
        labels: {
          color: "#9ca3af",
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) => {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            if (label === "Activity Minutes") {
              return `${label}: ${value} min`;
            } else {
              return `${label}: ${value}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: "rgba(75, 85, 99, 0.2)",
        },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "Activity Minutes",
          color: "#0cf2d0",
        },
        grid: {
          color: "rgba(75, 85, 99, 0.2)",
        },
        ticks: {
          color: "#0cf2d0",
          callback: function (value: string | number) {
            return `${value}m`;
          },
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: "Oura Scores",
          color: "#3b82f6",
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#3b82f6",
          max: 100,
          min: 0,
        },
      },
    },
  };

  // Calculate trend indicators
  const getActivityTrend = () => {
    if (trendData.length < 7) return { direction: "neutral", percentage: 0 };

    const firstWeek = trendData
      .slice(0, 7)
      .reduce((sum, d) => sum + d.activityMinutes, 0);
    const secondWeek = trendData
      .slice(7, 14)
      .reduce((sum, d) => sum + d.activityMinutes, 0);

    if (firstWeek === 0) return { direction: "neutral", percentage: 0 };

    const percentage = Math.round(((secondWeek - firstWeek) / firstWeek) * 100);
    const direction =
      percentage > 5 ? "up" : percentage < -5 ? "down" : "neutral";

    return { direction, percentage: Math.abs(percentage) };
  };

  const getReadinessTrend = () => {
    if (trendData.length < 7) return { direction: "neutral", percentage: 0 };

    const readinessData = trendData.filter((d) => d.readinessScore > 0);
    if (readinessData.length < 7)
      return { direction: "neutral", percentage: 0 };

    const firstWeek =
      readinessData.slice(0, 7).reduce((sum, d) => sum + d.readinessScore, 0) /
      7;
    const secondWeek =
      readinessData.slice(7, 14).reduce((sum, d) => sum + d.readinessScore, 0) /
      7;

    const percentage = Math.round(((secondWeek - firstWeek) / firstWeek) * 100);
    const direction =
      percentage > 2 ? "up" : percentage < -2 ? "down" : "neutral";

    return { direction, percentage: Math.abs(percentage) };
  };

  const activityTrend = getActivityTrend();
  const readinessTrend = getReadinessTrend();

  return (
    <section className="w-full px-6 py-8">
      <h2 className="text-2xl font-semibold text-white mb-4">
        Activity vs Recovery Trends
      </h2>

      {!showChart ? (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              View your 14-day activity and recovery correlation
            </p>
            <button
              onClick={() => {
                setShowChart(true);
                fetchTrendData();
              }}
              disabled={!hasValidToken}
              className="rounded-lg bg-[#0cf2d0] px-6 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Trend Data
            </button>
            {!hasValidToken && (
              <p className="text-sm text-red-400 mt-2">
                ⚠️ Configure Strava token above to load trend data
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white text-sm">
                Activity Minutes vs Oura Scores
              </p>
              <h3 className="text-xl font-bold text-white">Last 14 Days</h3>
              <div className="flex gap-4 text-sm mt-1">
                <span
                  className={`${
                    activityTrend.direction === "up"
                      ? "text-green-400"
                      : activityTrend.direction === "down"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  Activity:{" "}
                  {activityTrend.direction === "up"
                    ? "↗"
                    : activityTrend.direction === "down"
                    ? "↘"
                    : "→"}{" "}
                  {activityTrend.percentage}%
                </span>
                <span
                  className={`${
                    readinessTrend.direction === "up"
                      ? "text-green-400"
                      : readinessTrend.direction === "down"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  Readiness:{" "}
                  {readinessTrend.direction === "up"
                    ? "↗"
                    : readinessTrend.direction === "down"
                    ? "↘"
                    : "→"}{" "}
                  {readinessTrend.percentage}%
                </span>
              </div>
            </div>
            <button
              onClick={fetchTrendData}
              disabled={loading}
              className="text-sm px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-400">Loading trend data...</p>
            </div>
          ) : trendData.length > 0 ? (
            <div className="h-48">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-400">
                No data available for the selected period
              </p>
            </div>
          )}

          {trendData.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-gray-400">Avg Activity</p>
                <p className="text-[#0cf2d0] font-bold">
                  {Math.round(
                    trendData.reduce((sum, d) => sum + d.activityMinutes, 0) /
                      trendData.length
                  )}{" "}
                  min/day
                </p>
              </div>
              <div>
                <p className="text-gray-400">Avg Readiness</p>
                <p className="text-[#3b82f6] font-bold">
                  {Math.round(
                    trendData
                      .filter((d) => d.readinessScore > 0)
                      .reduce((sum, d) => sum + d.readinessScore, 0) /
                      trendData.filter((d) => d.readinessScore > 0).length || 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Avg Sleep</p>
                <p className="text-[#8b5cf6] font-bold">
                  {Math.round(
                    trendData
                      .filter((d) => d.sleepScore > 0)
                      .reduce((sum, d) => sum + d.sleepScore, 0) /
                      trendData.filter((d) => d.sleepScore > 0).length || 0
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
