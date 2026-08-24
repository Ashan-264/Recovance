"use client";

// pages/training.tsx
import Head from "next/head";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import { useStrava } from "@/app/contexts/StravaContext";
import {
  describeStravaError,
  loadCachedActivities,
  postStrava,
} from "@/lib/stravaClient";
import StravaConfig from "@/app/components/StravaConfig";
import Calendar from "@/app/components/training/Calendar";
import StravaStats from "@/app/components/training/StravaStats";

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

export default function TrainingPage() {
  const { hasValidToken } = useStrava();
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  const dateRange = () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return {
      startDate: twoYearsAgo.toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    };
  };

  // Render stored activities immediately on page load.
  useEffect(() => {
    let cancelled = false;
    const { startDate, endDate } = dateRange();

    loadCachedActivities<StravaActivity>(startDate, endDate).then((cached) => {
      if (!cancelled && cached.length > 0) {
        setActivities(cached);
        setLoadedFromCache(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch activities for the last 2 years to get comprehensive data
      const { startDate, endDate } = dateRange();

      const data = await postStrava<{ activities?: StravaActivity[] }>(
        "/api/strava/activities",
        { start_date: startDate, end_date: endDate }
      );

      setActivities(data.activities || []);
      setLoadedFromCache(false);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError(describeStravaError(err));
    } finally {
      setLoading(false);
    }
  };

  // Remove auto-loading - only load when button is clicked
  // useEffect(() => {
  //   const token = getStravaToken();
  //   if (token) {
  //     fetchActivities();
  //   }
  // }, [stravaToken]);

  return (
    <>
      <Head>
        <title>Recovance · Training</title>
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden"
        style={{ fontFamily: "Inter, 'Noto Sans', sans-serif" }}
      >
        {/* Header at the top */}
        <Header />

        <div className="flex h-full grow flex-col">
          <div className="flex h-full flex-1 justify-center px-6 py-5">
            {/* Main content */}
            <div className="flex flex-1 flex-col max-w-[960px]">
              {/* 1. Header section (Title + Description) */}
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <p className="text-[32px] font-bold leading-tight tracking-light text-white">
                    Training Analytics
                  </p>
                  <p className="text-sm font-normal leading-normal text-[#9cbab5]">
                    Analyze your Strava activities and training patterns
                  </p>
                </div>
              </div>

              {/* 3. Strava Configuration */}
              <div className="mx-4">
                <StravaConfig />
              </div>

              {/* 4. Load Activities */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Training Data
                    </h3>
                    <p className="text-sm text-gray-400">
                      {activities.length > 0
                        ? `${activities.length.toLocaleString()} activities loaded${
                            loadedFromCache ? " from your database" : ""
                          }`
                        : "No activities stored yet — sync to pull them from Strava"}
                    </p>
                  </div>
                  <button
                    onClick={fetchActivities}
                    disabled={loading}
                    className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
                  >
                    {loading
                      ? "Syncing..."
                      : activities.length > 0
                      ? "Sync new activities"
                      : "Load Activities"}
                  </button>
                </div>
                {!hasValidToken && activities.length === 0 && (
                  <p className="text-sm text-red-400 mt-2">
                    ⚠️ Connect Strava to load activities
                  </p>
                )}
                {error && (
                  <div className="mt-3 rounded-lg border border-red-600/40 bg-red-900/20 p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* 5. Calendar with Activity Counts */}
              <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                Activity Calendar
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-6 p-4">
                <Calendar activities={activities} />
              </div>

              {/* 6. Strava Statistics */}
              <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                Activity Statistics
              </h2>
              <div className="p-4">
                <StravaStats activities={activities} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
