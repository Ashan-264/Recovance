"use client";

import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";

/**
 * Home is a launchpad, not a demo: live connection status, what data is in
 * the database, and where to go — each destination explained in one line.
 */

interface ProviderStatus {
  name: string;
  displayName: string;
  configured: boolean;
}

interface Coverage {
  activities: number;
  nightsWithHrv: number;
  streams: number;
  ridesAnalyzed: number;
}

interface LiveCounts {
  live: number;
  total: number;
}

const DESTINATIONS = [
  {
    href: "/dashboard",
    title: "Dashboard",
    text: "Your rides on the map — routes, start points, and totals.",
  },
  {
    href: "/recovery",
    title: "Recovery",
    text: "Last night at a glance, sleep and readiness detail, burnout risk.",
  },
  {
    href: "/training",
    title: "Training",
    text: "Activity calendar and statistics across your history.",
  },
  {
    href: "/insights",
    title: "Insights",
    text: "The cross-source metrics: what training costs you and what it builds.",
  },
];

const Home: NextPage = () => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [ouraServerToken, setOuraServerToken] = useState(false);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [liveCounts, setLiveCounts] = useState<LiveCounts | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/status")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setProviders(data.providers ?? []);
        setOuraServerToken(Boolean(data.ouraServerTokenAvailable));
      })
      .catch(() => {});

    fetch("/api/insights")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (data.coverage) setCoverage(data.coverage);
        if (Array.isArray(data.features)) {
          setLiveCounts({
            live: data.features.filter(
              (feature: { status: string }) => feature.status === "live"
            ).length,
            total: data.features.length,
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyData = (coverage?.activities ?? 0) > 0;

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Head>
        <title>Recovance</title>
        <meta name="description" content="Your recovery & training hub" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-[#111817] text-white">
        <Header />

        <main className="mx-auto max-w-4xl px-6 py-10">
          {/* Greeting */}
          <p className="text-sm text-[#7f9d98]">{todayDate}</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">
            Welcome back
          </h1>

          {/* What's in the database right now */}
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#3b5450] bg-[#3b5450] sm:grid-cols-4">
            {[
              {
                label: "Activities",
                value: coverage ? coverage.activities.toLocaleString() : "…",
              },
              {
                label: "Nights of sleep data",
                value: coverage ? coverage.nightsWithHrv.toLocaleString() : "…",
              },
              {
                label: "Rides analysed",
                value: coverage
                  ? `${coverage.ridesAnalyzed.toLocaleString()}`
                  : "…",
              },
              {
                label: "Insights live",
                value: liveCounts ? `${liveCounts.live}/${liveCounts.total}` : "…",
              },
            ].map((tile) => (
              <div key={tile.label} className="bg-[#151f1e] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
                  {tile.label}
                </div>
                <div className="mt-1 text-[24px] font-semibold leading-none text-white">
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          {/* Connections in one line */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
              Connections
            </span>
            {providers.map((provider) => (
              <span
                key={provider.name}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  provider.configured ||
                  (provider.name === "oura" && ouraServerToken)
                    ? "border-[#0cf2d0]/40 text-[#0cf2d0]"
                    : "border-[#3b5450] text-[#7f9d98]"
                }`}
              >
                {provider.displayName}
              </span>
            ))}
            <Link
              href="/connect"
              className="ml-1 text-xs font-semibold text-[#0cf2d0] underline-offset-2 hover:underline"
            >
              Manage →
            </Link>
          </div>

          {/* First-run guidance when the database is empty */}
          {coverage && !hasAnyData && (
            <div className="mt-6 rounded-xl border border-[#e8c468]/30 bg-[#e8c468]/10 p-4 text-sm text-[#e8c468]">
              No data yet. Start on the{" "}
              <Link href="/connect" className="font-bold underline">
                Connect page
              </Link>{" "}
              — link Strava or Oura (or import a Garmin CSV) and everything else
              fills in automatically.
            </div>
          )}

          {/* Where to go */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DESTINATIONS.map((destination) => (
              <Link
                key={destination.href}
                href={destination.href}
                className="group rounded-xl border border-[#3b5450] bg-[#1e2a28] p-5 transition hover:border-[#0cf2d0]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    {destination.title}
                  </h2>
                  <span className="text-[#7f9d98] transition group-hover:text-[#0cf2d0]">
                    →
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#9cbab5]">{destination.text}</p>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-xs text-[#7f9d98]">
            Pages load from your own database first and only contact Strava or
            Oura for data they have never seen — so everything works even when a
            connection is down.
          </p>
        </main>
      </div>
    </>
  );
};

export default Home;
