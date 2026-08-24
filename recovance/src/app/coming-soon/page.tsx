"use client";

import Head from "next/head";
import Link from "next/link";
import Header from "@/app/components/Header";

/**
 * The honest parking lot.
 *
 * Everything that used to be a dead button or a mock card lives here instead,
 * stated as a plan rather than pretending to work. Items move out of this page
 * when they ship, not before.
 */

const PLANNED = [
  {
    title: "AI training suggestions",
    text: "Real recommendations generated from your recovery cost, durability and drift metrics — replacing the mock suggestion cards that used to sit on the dashboard.",
  },
  {
    title: "Training plan generator",
    text: "Build a week around what your data says you can absorb, not a template.",
  },
  {
    title: "Manual session log (RPE + focus tag)",
    text: "A 10-second log after strength sessions. This is also the unlock for the Interference Index — it needs ~16 more tagged sessions to compute.",
  },
  {
    title: "Recovery notes",
    text: "Free-text notes on how you actually feel, correlated against the metrics later.",
  },
  {
    title: "Notifications",
    text: "Send-day warnings and stacked-tendon-load alerts, once those metrics have earned trust.",
  },
  {
    title: "One-click wearable sync",
    text: "A single button that refreshes every connected provider at once.",
  },
];

const PARKED_METRICS = [
  {
    id: "F3",
    title: "Send-day gate",
    unlock: "Wear the ring the night before rides for ~6 weeks",
  },
  {
    id: "F5",
    title: "Illness early warning",
    unlock: "Needs ≥60% ring wear in the last 60 days (currently 0%)",
  },
  {
    id: "F2",
    title: "Interference index",
    unlock: "Needs ~16 more strength sessions with an RPE tag",
  },
];

export default function ComingSoonPage() {
  return (
    <>
      <Head>
        <title>Recovance · Coming up</title>
      </Head>

      <div className="min-h-screen bg-[#111817] text-white">
        <Header />

        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-[32px] font-bold leading-tight">Coming up</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9cbab5]">
            Features that are planned but not built yet. Nothing here pretends
            to work — buttons and cards move onto the real pages only when they
            do something.
          </p>

          <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-[0.08em] text-[#7f9d98]">
            Planned features
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PLANNED.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#3b5450] bg-[#1e2a28] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <span className="shrink-0 rounded-full bg-[#3b5450]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9cbab5]">
                    Planned
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#9cbab5]">{item.text}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-10 mb-3 text-sm font-bold uppercase tracking-[0.08em] text-[#7f9d98]">
            Metrics waiting on data
          </h2>
          <p className="mb-3 max-w-2xl text-xs text-[#7f9d98]">
            These exist in the{" "}
            <Link href="/insights" className="text-[#0cf2d0] underline-offset-2 hover:underline">
              Insights Lab
            </Link>{" "}
            as cards showing exactly what they need; they light up on their own
            once the data supports them.
          </p>
          <div className="space-y-2">
            {PARKED_METRICS.map((metric) => (
              <div
                key={metric.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[#2b3a38] bg-[#161f1e] px-4 py-3"
              >
                <div>
                  <span className="mr-2 font-mono text-xs text-[#7f9d98]">
                    {metric.id}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {metric.title}
                  </span>
                </div>
                <span className="text-xs text-[#9cbab5]">{metric.unlock}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
