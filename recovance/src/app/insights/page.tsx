"use client";

// pages/insights.tsx
import Head from "next/head";
import { useState, useEffect } from "react";
import {
  InsightsHeader,
  PageIntro,
  SportTabs,
  SportInsightCard,
  AnalysisRow,
  DeviceTabsAndCards,
} from "@/app/components/insights";
import OuraInsights from "@/app/components/insights/OuraInsights";
import StravaInsights from "@/app/components/insights/StravaInsights";

export default function InsightsPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [stravaToken, setStravaToken] = useState("");
  const [showInsights, setShowInsights] = useState(false);

  // Get Strava token from input or environment variable
  const getStravaToken = () => {
    return stravaToken || process.env.NEXT_PUBLIC_STRAVA_API_TOKEN || "";
  };

  // Example inline SVG for "Cycling Power Output" card
  const cyclingPowerSvg = (
    <svg
      width="100%"
      height="148"
      viewBox="-3 0 478 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M0 109C18.1538 109 18.1538 21 … V109Z"
        fill="url(#paint0_linear_1131_5935)"
      />
      <path
        d="M0 109C18.1538 109 18.1538 21 … 472 25"
        stroke="#9db9b5"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1131_5935"
          x1="236"
          y1="1"
          x2="236"
          y2="149"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#283936" />
          <stop offset="1" stopColor="#283936" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );

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

              {/* 3. Date Range and Token Controls */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white">
                      Strava Token:
                    </label>
                    <input
                      type="password"
                      placeholder="Enter Strava access token (or use STRAVA_API_TOKEN env var)"
                      className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                      value={stravaToken}
                      onChange={(e) => setStravaToken(e.target.value)}
                    />
                    {!stravaToken &&
                      process.env.NEXT_PUBLIC_STRAVA_API_TOKEN && (
                        <p className="text-xs text-green-400 mt-1">
                          Using environment variable STRAVA_API_TOKEN
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Load Button */}
              <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mx-4 mb-6">
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition"
                >
                  {showInsights ? "Hide Insights" : "Load Insights"}
                </button>
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
