// pages/dashboard.tsx
import Head from "next/head";
import DashboardHeader from "@/app/components/Header";
import {
  WelcomeBanner,
  TodaysHighlights,
  RecoveryAndHealth,
  TrendVisualizer,
  AISuggestions,
  ActionButtons,
} from "@/app/components/dashboard";

export default function DashboardPage() {
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

              {/* 2b. Today's Highlights */}
              <TodaysHighlights />

              {/* 2c. Recovery & Health */}
              <RecoveryAndHealth />

              {/* 2d. Trend Visualizer */}
              <TrendVisualizer />

              {/* 2e. AI Suggestions */}
              <AISuggestions />

              {/* 2f. Bottom Action Buttons */}
              <ActionButtons />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
