"use client";

// pages/insights.tsx
import Head from "next/head";
import { useState } from "react";
import { InsightsHeader, PageIntro } from "@/app/components/insights";
import StravaConfig from "@/app/components/StravaConfig";
import OuraInsights from "@/app/components/insights/OuraInsights";
import StravaInsights from "@/app/components/insights/StravaInsights";
import InsightsLab from "@/app/components/insights/InsightsLab";

export default function InsightsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showInsights] = useState(true);

  return (
    <>
      <Head>
        <title>Recovance · Insights</title>
        {/* Google Fonts & Tailwind JS should already be loaded in _app.tsx or a root layout */}
      </Head>

      <div
        className="relative flex w-full min-h-screen flex-col bg-[#111817] overflow-x-hidden"
        style={{ fontFamily: `Inter, "Noto Sans", sans-serif` }}
      >
        <div className="layout-container flex h-full grow flex-col">
          {/* 1. Header */}
          <InsightsHeader />

          <div className="flex flex-1 justify-center px-4 py-5 md:px-10 lg:px-40">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              {/* 2. Page Intro (Title + subtitle) */}
              <PageIntro />

              {/* 2b. Insights Lab — every cross-source metric, computed from
                  the database, with the unavailable ones stating why. */}
              <div className="mb-8">
                <InsightsLab />
              </div>

              {/* 3. Strava Configuration */}
              <div className="mx-4">
                <StravaConfig />
              </div>

              {/* 4. Date Range Controls — one compact row; sections below
                  react to it automatically */}
              <div className="mx-4 mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-[#3b5450] bg-[#1e2a28] p-3">
                <span className="text-sm font-semibold text-[#9cbab5]">
                  Date range
                </span>
                <input
                  type="date"
                  aria-label="Start date"
                  className="rounded-md border border-[#3b5450] bg-[#283937] p-1.5 text-sm text-white"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-xs text-[#7f9d98]">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  className="rounded-md border border-[#3b5450] bg-[#283937] p-1.5 text-sm text-white"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <span className="ml-auto text-xs text-[#7f9d98]">
                  loads from your database automatically
                </span>
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
                    <StravaInsights startDate={startDate} endDate={endDate} />
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
