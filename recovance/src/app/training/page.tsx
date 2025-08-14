"use client";

// pages/training.tsx
import Head from "next/head";
import { useState } from "react";
import Header from "@/app/components/Header";
import { useStrava } from "@/app/contexts/StravaContext";
import StravaConfig from "@/app/components/StravaConfig";
import ActivityDataUpload from "@/app/components/ActivityDataUpload";
import TabNavigation from "@/app/components/training/TabNavigation";
import Calendar from "@/app/components/training/Calendar";
import StravaStats from "@/app/components/training/StravaStats";
import AIRecommendations from "@/app/components/AISuggestions";
import ActionButtons from "@/app/components/ActionButtons";

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
  const { getStravaToken, hasValidToken } = useStrava();
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = async () => {
    const token = getStravaToken();
    if (!token) {
      console.error("No Strava token available");
      return;
    }

    setLoading(true);
    try {
      // Fetch activities for the last 2 years to get comprehensive data
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const startDate = twoYearsAgo.toISOString().split("T")[0];
      const endDate = new Date().toISOString().split("T")[0];

      const response = await fetch("/api/strava/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: token,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
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
        <title>Stitch Design · Training Analytics</title>
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

              {/* 2. Tabs */}
              <div className="pb-3">
                <TabNavigation />
              </div>

              {/* 3. Strava Configuration */}
              <div className="mx-4">
                <StravaConfig />
              </div>

              {/* 3.5. Activity Data Upload */}
              <div className="mx-4">
                <ActivityDataUpload />
              </div>

              {/* 4. Load Activities */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Training Data
                    </h3>
                    <p className="text-sm text-gray-400">
                      Load your Strava activities to analyze training patterns
                    </p>
                  </div>
                  <button
                    onClick={fetchActivities}
                    disabled={loading || !hasValidToken}
                    className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load Activities"}
                  </button>
                </div>
                {!hasValidToken && (
                  <p className="text-sm text-red-400 mt-2">
                    ⚠️ Configure Strava token above to load activities
                  </p>
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

              {/* 6. AI Recommendations */}
              <h2 className="px-4 pb-3 pt-5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-white">
                AI Recommendations
              </h2>
              <div className="p-4">
                <AIRecommendations />
              </div>

              {/* 7. Bottom Action Buttons */}
              <div className="flex justify-stretch">
                <div className="flex flex-1 flex-wrap justify-end gap-3 px-4 py-3">
                  <ActionButtons />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
