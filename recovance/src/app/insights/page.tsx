"use client";

// pages/insights.tsx
import Head from "next/head";
import { useState } from "react";
import { InsightsHeader, PageIntro } from "@/app/components/insights";
import { useStrava } from "@/app/contexts/StravaContext";
import StravaConfig from "@/app/components/StravaConfig";
import OuraInsights from "@/app/components/insights/OuraInsights";
import StravaInsights from "@/app/components/insights/StravaInsights";

export default function InsightsPage() {
  const { getStravaToken, hasValidToken } = useStrava();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showInsights, setShowInsights] = useState(false);

  return (
    <>
      <Head>
        <title>Stitch Design · Insights</title>
        {/* Google Fonts & Tailwind JS should already be loaded in _app.tsx or a root layout */}
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden"
        style={{ fontFamily: `Inter, "Noto Sans", sans-serif` }}
      >
        <div className="layout-container flex h-full grow flex-col">
          {/* 1. Header */}
          <InsightsHeader />

          <div className="px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              {/* 2. Page Intro (Title + subtitle) */}
              <PageIntro />

              {/* 3. Strava Configuration */}
              <div className="mx-4">
                <StravaConfig />
              </div>

              {/* 4. Date Range Controls */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Date Range
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white">
                      Start Date:
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white">
                      End Date:
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Load Button */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-6">
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  disabled={!hasValidToken}
                  className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
                >
                  {showInsights ? "Hide Insights" : "Load Insights"}
                </button>
                {!hasValidToken && (
                  <p className="text-sm text-red-400 mt-2">
                    ⚠️ Configure Strava token above to load insights
                  </p>
                )}
              </div>

              {showInsights && (
                <>
                  {/* 4. Oura Insights */}
                  <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                    Oura Insights
                  </h2>
                  <div className="px-4 pb-6">
                    <OuraInsights startDate={startDate} endDate={endDate} />
                  </div>

                  {/* 5. Strava Insights */}
                  <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                    Strava Insights
                  </h2>
                  <div className="px-4 pb-6">
                    <StravaInsights
                      startDate={startDate}
                      endDate={endDate}
                      stravaToken={getStravaToken()}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
