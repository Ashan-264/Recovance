"use client";

import type { NextPage } from "next";
import Head from "next/head";
import {
  Header,
  WelcomeSection,
  TrendVisualizer,
  AISuggestions,
  ActionButtons,
} from "@/app/components";

const Home: NextPage = () => {
  const todayDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }); // e.g. "October 26, 2024"

  // Example callback implementations – replace with real logic
  const handleGeneratePlan = () => {
    alert("Generate Training Plan clicked");
  };
  const handleLogSession = () => {
    alert("Log New Session clicked");
  };
  const handleSyncWearables = () => {
    alert("Sync Wearables clicked");
  };
  const handleUpdateNotes = () => {
    alert("Update Recovery Notes clicked");
  };

  return (
    <>
      <Head>
        <title>Recovance Dashboard</title>
        <meta name="description" content="Your recovery & training hub" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-[#111817] text-white">
        {/* Header / Navbar */}
        <Header />

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          <WelcomeSection
            name="Ashan"
            date={todayDate}
            recoveryPercentage={87}
          />

          <TrendVisualizer />

          <AISuggestions />

          <ActionButtons
            onGeneratePlan={handleGeneratePlan}
            onLogSession={handleLogSession}
            onSyncWearables={handleSyncWearables}
            onUpdateNotes={handleUpdateNotes}
          />
        </main>
      </div>
    </>
  );
};

export default Home;
