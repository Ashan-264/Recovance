"use client";

// pages/dashboard.tsx
import Head from "next/head";
import { useState } from "react";
import DashboardHeader from "@/app/components/Header";
import {
  WelcomeBanner,
  TrendVisualizer,
  AISuggestions,
  ActionButtons,
} from "@/app/components/dashboard";
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
  map?: unknown;
  has_kudoed: boolean;
  hide_from_home: boolean;
  workout_type?: number;
  suffer_score?: number;
}

export default function DashboardPage() {
  const [stravaToken, setStravaToken] = useState("");
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapMode, setMapMode] = useState<"interactive" | "flat">("interactive");

  // Get Strava token from input or environment variable
  const getStravaToken = () => {
    return stravaToken || process.env.NEXT_PUBLIC_STRAVA_API_TOKEN || "";
  };

  const fetchActivities = async () => {
    const token = getStravaToken();
    if (!token) {
      console.error("No Strava token available");
      return;
    }
    setLoading(true);
    try {
      // Fetch ALL activities ever recorded (from 1970 to now)
      const startDate = "1970-01-01";
      const endDate = new Date().toISOString().split("T")[0];

      const response = await fetch("/api/strava/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: token,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data.activities?.length || 0} activities`);
        setActivities(data.activities || []);
      } else {
        console.error("Failed to fetch activities");
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
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
        <title>Stitch Design · Dashboard</title>
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#121616] overflow-x-hidden"
        style={{ fontFamily: `Inter, "Noto Sans", sans-serif` }}
      >
        <div className="layout-container flex h-full grow flex-col">
          {/* 1. Header */}
          <DashboardHeader />

          {/* 2. Main Content */}
          <div className="px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              {/* 2a. Welcome Banner */}
              <WelcomeBanner />

              {/* 2b. API Tokens Input */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  API Configuration
                </h3>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-white">
                    Strava Access Token:
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your Strava access token (or use STRAVA_API_TOKEN env var)"
                    className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                    value={stravaToken}
                    onChange={(e) => setStravaToken(e.target.value)}
                  />
                  {!stravaToken && process.env.NEXT_PUBLIC_STRAVA_API_TOKEN && (
                    <p className="text-xs text-green-400 mt-1">
                      Using environment variable STRAVA_API_TOKEN
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchActivities}
                    disabled={loading || !getStravaToken()}
                    className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load Activities"}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Note: API tokens can be configured via environment variables
                    (STRAVA_API_TOKEN, MAP_BOX_API)
                  </p>
                </div>
              </div>

              {/* 2c. Activity Map */}
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

              {/* 2g. AI Suggestions */}
              <AISuggestions />

              {/* 2h. Bottom Action Buttons */}
              <ActionButtons />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
