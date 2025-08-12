"use client";

import React, { useState, useEffect } from "react";

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

interface ActivityStats {
  total: number;
  moving_time: number;
  distance: number;
  elevation_gain: number;
}

interface TimeFrameStats {
  all_time: ActivityStats;
  this_year: ActivityStats;
  this_month: ActivityStats;
}

interface ActivityTypeStats {
  [key: string]: TimeFrameStats;
}

const activityTypeColors: { [key: string]: string } = {
  Run: "bg-red-500",
  Ride: "bg-blue-500",
  Walk: "bg-green-500",
  Swim: "bg-cyan-500",
  Hike: "bg-orange-500",
  WeightTraining: "bg-purple-500",
  Yoga: "bg-pink-500",
  Workout: "bg-indigo-500",
  default: "bg-gray-500",
};

interface StravaStatsProps {
  activities?: StravaActivity[];
}

type UnitSystem = "metric" | "imperial";

export default function StravaStats({ activities = [] }: StravaStatsProps) {
  const [stats, setStats] = useState<ActivityTypeStats>({});
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  useEffect(() => {
    if (activities.length > 0) {
      calculateStats(activities);
    }
  }, [activities]);

  const calculateStats = (activities: StravaActivity[]) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const stats: ActivityTypeStats = {};

    activities.forEach((activity) => {
      const activityDate = new Date(activity.start_date);
      const activityYear = activityDate.getFullYear();
      const activityMonth = activityDate.getMonth();

      if (!stats[activity.type]) {
        stats[activity.type] = {
          all_time: {
            total: 0,
            moving_time: 0,
            distance: 0,
            elevation_gain: 0,
          },
          this_year: {
            total: 0,
            moving_time: 0,
            distance: 0,
            elevation_gain: 0,
          },
          this_month: {
            total: 0,
            moving_time: 0,
            distance: 0,
            elevation_gain: 0,
          },
        };
      }

      // All time stats
      stats[activity.type].all_time.total++;
      stats[activity.type].all_time.moving_time += activity.moving_time;
      stats[activity.type].all_time.distance += activity.distance;
      stats[activity.type].all_time.elevation_gain +=
        activity.total_elevation_gain;

      // This year stats
      if (activityYear === currentYear) {
        stats[activity.type].this_year.total++;
        stats[activity.type].this_year.moving_time += activity.moving_time;
        stats[activity.type].this_year.distance += activity.distance;
        stats[activity.type].this_year.elevation_gain +=
          activity.total_elevation_gain;
      }

      // This month stats
      if (activityYear === currentYear && activityMonth === currentMonth) {
        stats[activity.type].this_month.total++;
        stats[activity.type].this_month.moving_time += activity.moving_time;
        stats[activity.type].this_month.distance += activity.distance;
        stats[activity.type].this_month.elevation_gain +=
          activity.total_elevation_gain;
      }
    });

    setStats(stats);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number): string => {
    if (unitSystem === "metric") {
      if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)}km`;
      }
      return `${Math.round(meters)}m`;
    } else {
      // Convert to imperial
      const feet = meters * 3.28084;
      const miles = feet / 5280;
      if (miles >= 1) {
        return `${miles.toFixed(1)}mi`;
      }
      return `${Math.round(feet)}ft`;
    }
  };

  const formatElevation = (meters: number): string => {
    if (unitSystem === "metric") {
      return `${Math.round(meters)}m`;
    } else {
      // Convert to imperial
      const feet = Math.round(meters * 3.28084);
      return `${feet}ft`;
    }
  };

  const getActivityColor = (type: string): string => {
    return activityTypeColors[type] || activityTypeColors.default;
  };

  return (
    <div className="space-y-6">
      {/* Unit System Toggle */}
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-white">Units:</label>
          <div className="flex bg-[#283937] rounded-lg p-1">
            <button
              onClick={() => setUnitSystem("metric")}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                unitSystem === "metric"
                  ? "bg-[#0cf2d0] text-[#111817]"
                  : "text-white hover:text-[#0cf2d0]"
              }`}
            >
              Metric (km/m)
            </button>
            <button
              onClick={() => setUnitSystem("imperial")}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                unitSystem === "imperial"
                  ? "bg-[#0cf2d0] text-[#111817]"
                  : "text-white hover:text-[#0cf2d0]"
              }`}
            >
              Imperial (mi/ft)
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      {activities.length > 0 && (
        <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
          <h3 className="text-lg font-bold text-white mb-4">
            Overall Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {activities.length}
              </p>
              <p className="text-sm text-gray-400">Total Activities</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {formatTime(
                  activities.reduce((sum, a) => sum + a.moving_time, 0)
                )}
              </p>
              <p className="text-sm text-gray-400">Total Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {formatDistance(
                  activities.reduce((sum, a) => sum + a.distance, 0)
                )}
              </p>
              <p className="text-sm text-gray-400">Total Distance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {formatElevation(
                  activities.reduce((sum, a) => sum + a.total_elevation_gain, 0)
                )}
              </p>
              <p className="text-sm text-gray-400">Total Elevation</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Type Breakdown */}
      {Object.keys(stats).length > 0 && (
        <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
          <h3 className="text-lg font-bold text-white mb-4">
            Activity Type Breakdown
          </h3>
          <div className="space-y-4">
            {Object.entries(stats).map(([type, timeStats]) => (
              <div
                key={type}
                className="border border-[#3b5450] rounded-lg p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-4 h-4 rounded-full ${getActivityColor(type)}`}
                  ></div>
                  <h4 className="text-lg font-semibold text-white">{type}</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-400 mb-2">
                      All Time
                    </h5>
                    <div className="space-y-1">
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {timeStats.all_time.total}
                        </span>{" "}
                        activities
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatTime(timeStats.all_time.moving_time)}
                        </span>{" "}
                        total time
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatDistance(timeStats.all_time.distance)}
                        </span>{" "}
                        total distance
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatElevation(timeStats.all_time.elevation_gain)}
                        </span>{" "}
                        total elevation
                      </p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-400 mb-2">
                      This Year
                    </h5>
                    <div className="space-y-1">
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {timeStats.this_year.total}
                        </span>{" "}
                        activities
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatTime(timeStats.this_year.moving_time)}
                        </span>{" "}
                        total time
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatDistance(timeStats.this_year.distance)}
                        </span>{" "}
                        total distance
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatElevation(timeStats.this_year.elevation_gain)}
                        </span>{" "}
                        total elevation
                      </p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-gray-400 mb-2">
                      This Month
                    </h5>
                    <div className="space-y-1">
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {timeStats.this_month.total}
                        </span>{" "}
                        activities
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatTime(timeStats.this_month.moving_time)}
                        </span>{" "}
                        total time
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatDistance(timeStats.this_month.distance)}
                        </span>{" "}
                        total distance
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-[#0cf2d0]">
                          {formatElevation(timeStats.this_month.elevation_gain)}
                        </span>{" "}
                        total elevation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
