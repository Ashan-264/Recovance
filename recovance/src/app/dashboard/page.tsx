"use client";

// pages/dashboard.tsx
import Head from "next/head";
import { useEffect, useState } from "react";
import DashboardHeader from "@/app/components/Header";
import { useStrava } from "@/app/contexts/StravaContext";
import {
  describeStravaError,
  loadCachedActivities,
  postStrava,
} from "@/lib/stravaClient";
import StravaConfig from "@/app/components/StravaConfig";
import { WelcomeBanner, TrendVisualizer } from "@/app/components/dashboard";
import dynamic from "next/dynamic";

const ActivityMap = dynamic(
  () => import("@/app/components/dashboard/ActivityMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-[#1e2a28] rounded-lg flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    ),
  }
);

const LeafletDarkFlatMap = dynamic(
  () => import("@/app/components/dashboard/LeafletDarkFlatMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-[#1e2a28] rounded-lg flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    ),
  }
);

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
  map?: { summary_polyline?: string } | null;
  has_kudoed: boolean;
  hide_from_home: boolean;
  workout_type?: number;
  suffer_score?: number;
}

export default function DashboardPage() {
  const { hasValidToken } = useStrava();
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [mapMode, setMapMode] = useState<"interactive" | "flat">("interactive");

  // Show whatever is already stored as soon as the page opens; the button
  // below refreshes from Strava for anything not yet cached.
  useEffect(() => {
    let cancelled = false;

    loadCachedActivities<StravaActivity>(
      "1970-01-01",
      new Date().toISOString().split("T")[0]
    ).then((cached) => {
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
      // Fetch ALL activities ever recorded (from 1970 to now)
      const startDate = "1970-01-01";
      const endDate = new Date().toISOString().split("T")[0];

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
        {/* The global <title> is already set in _app.tsx, so you could omit this or override it */}
        <title>Recovance · Dashboard</title>
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#121616] overflow-x-hidden"
        style={{ fontFamily: `Inter, "Noto Sans", sans-serif` }}
      >
        <div className="layout-container flex h-full grow flex-col">
          {/* 1. Header */}
          <DashboardHeader />

          {/* 2. Main Content */}
          <div className="flex flex-1 justify-center px-4 py-5 md:px-10 lg:px-40">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              {/* 2a. Welcome Banner */}
              <WelcomeBanner />

              {/* 2b. Strava Configuration */}
              <div className="mx-4">
                <StravaConfig />
              </div>

              {/* 2c. Load Activities */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Activity Data
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

              {/* 2d. Activity Map */}
              <div className="mx-4 mb-6 space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMapMode("interactive")}
                    className={`px-3 py-1 rounded-md text-sm font-semibold ${
                      mapMode === "interactive"
                        ? "bg-[#0cf2d0] text-[#111817]"
                        : "bg-[#283937] text-gray-300"
                    }`}
                  >
                    Interactive
                  </button>
                  <button
                    onClick={() => setMapMode("flat")}
                    className={`px-3 py-1 rounded-md text-sm font-semibold ${
                      mapMode === "flat"
                        ? "bg-[#0cf2d0] text-[#111817]"
                        : "bg-[#283937] text-gray-300"
                    }`}
                  >
                    Flat
                  </button>
                </div>

                {mapMode === "interactive" ? (
                  <ActivityMap activities={activities} />
                ) : (
                  <LeafletDarkFlatMap activities={activities} />
                )}
              </div>

              {/* 2f. Trend Visualizer */}
              <TrendVisualizer />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
