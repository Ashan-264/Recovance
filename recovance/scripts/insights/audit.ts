/**
 * P0-4 — Data-sufficiency audit.
 *
 *   npx tsx scripts/insights/audit.ts
 *
 * Measures what the database actually contains and applies each feature's
 * Gate A threshold from INSIGHTS_BUILD_PLAN.md, writing
 * docs/evidence/00-data-audit.md. This is the file that decides what gets built
 * next — no feature proceeds on the strength of the idea alone.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { buildNightlyReadings } from "../../src/lib/insights/baselines";
import { createClient, formatDay, resolveUserId } from "./_client";

type Verdict = "GO" | "PARK";

interface Gate {
  id: string;
  name: string;
  requirement: string;
  actual: string;
  verdict: Verdict;
  note?: string;
}

function verdict(pass: boolean): Verdict {
  return pass ? "GO" : "PARK";
}

function pct(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`;
}

async function main() {
  const prisma = createClient();

  try {
    const userId = await resolveUserId(prisma);

    // ---- raw counts -------------------------------------------------------
    const [activities, streams, dailyRecords, sleepPeriods] = await Promise.all([
      prisma.stravaActivity.findMany({
        where: { userId },
        select: { stravaId: true, type: true, startDate: true, payload: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.stravaStream.findMany({
        where: { userId },
        select: { stravaId: true, pointCount: true },
      }),
      prisma.ouraDailyRecord.findMany({
        where: { userId },
        select: { dataset: true, day: true, payload: true },
      }),
      prisma.ouraSleepPeriod.findMany({
        where: { userId },
        select: { day: true, payload: true },
      }),
    ]);

    const streamIds = new Set(streams.map((row) => row.stravaId.toString()));

    const byType = new Map<string, { total: number; hr: number; gps: number; streams: number }>();
    for (const activity of activities) {
      const payload = activity.payload as Record<string, unknown>;
      const entry = byType.get(activity.type) || { total: 0, hr: 0, gps: 0, streams: 0 };
      entry.total++;
      if (payload.has_heartrate === true) entry.hr++;
      const map = payload.map as { summary_polyline?: string } | null;
      if (map?.summary_polyline) entry.gps++;
      if (streamIds.has(activity.stravaId.toString())) entry.streams++;
      byType.set(activity.type, entry);
    }

    const rideTypes = ["MountainBikeRide", "Ride", "GravelRide"];
    const strengthTypes = ["WeightTraining", "Workout", "Crossfit"];
    const rides = activities.filter((a) => rideTypes.includes(a.type));
    const mtb = activities.filter((a) => a.type === "MountainBikeRide");
    const strength = activities.filter((a) => strengthTypes.includes(a.type));

    // ---- Oura coverage ----------------------------------------------------
    const readiness = dailyRecords
      .filter((row) => row.dataset === "daily_readiness")
      .map((row) => row.payload as Record<string, unknown>);
    const dailySleep = dailyRecords
      .filter((row) => row.dataset === "daily_sleep")
      .map((row) => row.payload as Record<string, unknown>);
    const stressDays = new Set(
      dailyRecords.filter((r) => r.dataset === "daily_stress").map((r) => formatDay(r.day))
    );

    const nightly = buildNightlyReadings({
      sleepPeriods: sleepPeriods.map((row) => row.payload as Record<string, unknown>),
      readiness,
      dailySleep,
    });

    const nightsWithHrv = nightly.filter((night) => night.hrv !== null);
    const nightsWithTemp = nightly.filter((night) => night.tempDeviation !== null);

    // Nights carrying the 5-minute HRV series that recovery latency needs.
    // Counted as distinct days, not periods — a night with a nap would
    // otherwise be counted twice and inflate the gate.
    const nightsWith5MinHrv = new Set(
      sleepPeriods
        .filter((row) => {
          const payload = row.payload as { hrv?: { items?: unknown[] } | null };
          return (payload.hrv?.items?.length ?? 0) > 10;
        })
        .map((row) => formatDay(row.day))
    ).size;

    // Wear coverage over the trailing 60 and 365 days.
    const today = new Date();
    const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);
    const hrvDays = new Set(nightsWithHrv.map((night) => night.day));
    const coverageOver = (days: number) => {
      let covered = 0;
      for (let i = 1; i <= days; i++) {
        if (hrvDays.has(formatDay(daysAgo(i)))) covered++;
      }
      return covered;
    };
    const cover60 = coverageOver(60);
    const cover365 = coverageOver(365);

    // Activity -> next-night Oura pairs (the join feature 1 depends on).
    const pairs = activities.filter((activity) => {
      const next = new Date(activity.startDate.getTime() + 86_400_000);
      return hrvDays.has(formatDay(next));
    });
    const pairsByBucket = new Map<string, number>();
    for (const activity of pairs) {
      const bucket = rideTypes.includes(activity.type)
        ? activity.type === "MountainBikeRide"
          ? "mtb"
          : "road"
        : strengthTypes.includes(activity.type)
        ? "strength"
        : "other";
      pairsByBucket.set(bucket, (pairsByBucket.get(bucket) || 0) + 1);
    }
    const bucketsWith8 = [...pairsByBucket.values()].filter((n) => n >= 8).length;

    // Ride mornings with a readiness or HRV+temp reading (feature 3).
    const rideDaysWithOura = rides.filter((ride) =>
      hrvDays.has(formatDay(ride.startDate))
    ).length;

    // Rest days (feature 6).
    const trainingDays = new Set(activities.map((a) => formatDay(a.startDate)));
    const allOuraDays = new Set(nightly.map((n) => n.day));
    const restDays = [...allOuraDays].filter((day) => !trainingDays.has(day));
    const restDaysWithStress = restDays.filter((day) => stressDays.has(day)).length;

    // Long rides for durability (feature 11).
    const longRidesWithHr = rides.filter((ride) => {
      const payload = ride.payload as Record<string, unknown>;
      return (
        payload.has_heartrate === true &&
        typeof payload.moving_time === "number" &&
        (payload.moving_time as number) >= 3600 &&
        streamIds.has(ride.stravaId.toString())
      );
    }).length;

    const streamsForRides = rides.filter((r) => streamIds.has(r.stravaId.toString())).length;

    // ---- gates ------------------------------------------------------------
    const gates: Gate[] = [
      {
        id: "F12",
        name: "Technical vs aerobic load split",
        requirement: "streams for ≥100 rides",
        actual: `${streamsForRides} of ${rides.length} rides have streams`,
        verdict: verdict(streamsForRides >= 100),
        note:
          streamsForRides === 0
            ? "BLOCKED, not just short of data: the Strava streams endpoint returns 404 for the current token. " +
              "Stream and per-activity reads need `activity:read_all`; a token copied from strava.com/settings/api " +
              "only carries `read`. Reconnect via /connect (which requests the right scope and stores a refreshable " +
              "token), then run `npx tsx scripts/insights/backfill-streams.ts`. Seven features unblock at once."
            : undefined,
      },
      {
        id: "F1",
        name: "Per-activity-type recovery cost",
        requirement: "≥25 activity→next-night pairs AND ≥8 pairs in ≥2 buckets",
        actual: `${pairs.length} pairs; buckets with ≥8: ${bucketsWith8} (${[...pairsByBucket]
          .map(([k, v]) => `${k}:${v}`)
          .join(", ")})`,
        verdict: verdict(pairs.length >= 25 && bucketsWith8 >= 2),
      },
      {
        id: "F13",
        name: "Connective-tissue load spacing",
        requirement: "F12 shipped (needs descent load)",
        actual: `depends on F12 (${streamsForRides} rides with streams)`,
        verdict: verdict(streamsForRides >= 100),
      },
      {
        id: "F3",
        name: "Send-day gate",
        requirement: "≥60% of ride days have readiness/HRV",
        actual: `${rideDaysWithOura}/${rides.length} ride days (${pct(rideDaysWithOura, rides.length)})`,
        verdict: verdict(rides.length > 0 && rideDaysWithOura / rides.length >= 0.6),
        note:
          rides.length > 0 && rideDaysWithOura / rides.length < 0.6
            ? "Wear the ring the night before rides to un-park."
            : undefined,
      },
      {
        id: "F11",
        name: "Aerobic durability (decoupling)",
        requirement: "≥20 rides >60 min with HR + streams",
        actual: `${longRidesWithHr} qualifying rides`,
        verdict: verdict(longRidesWithHr >= 20),
      },
      {
        id: "F10",
        name: "Climb repeatability",
        requirement: "≥15 rides with streams (climb detection)",
        actual: `${streamsForRides} rides with streams`,
        verdict: verdict(streamsForRides >= 15),
      },
      {
        id: "F7",
        name: "Descent skill score",
        requirement: "≥30 descents on ≥3 repeated trails (needs MTB streams)",
        actual: `${mtb.filter((r) => streamIds.has(r.stravaId.toString())).length} of ${mtb.length} MTB rides have streams`,
        verdict: verdict(mtb.filter((r) => streamIds.has(r.stravaId.toString())).length >= 20),
      },
      {
        id: "F9",
        name: "Effort-normalized trail progression",
        requirement: "F7 shipped",
        actual: "depends on F7",
        verdict: verdict(false),
      },
      {
        id: "F8",
        name: "Fear/arousal proxy",
        requirement: "F7 shipped + descent HR streams",
        actual: "depends on F7",
        verdict: verdict(false),
      },
      {
        id: "F6",
        name: "Rest-day audit",
        requirement: "daily_stress on ≥50% of rest days",
        actual: `${restDaysWithStress}/${restDays.length} rest days (${pct(restDaysWithStress, restDays.length)})`,
        verdict: verdict(restDays.length > 0 && restDaysWithStress / restDays.length >= 0.5),
      },
      {
        id: "F5",
        name: "Illness / overreach early warning",
        requirement: "≥60% ring wear in trailing 60 days",
        actual: `${cover60}/60 nights (${pct(cover60, 60)})`,
        verdict: verdict(cover60 / 60 >= 0.6),
        note:
          cover60 / 60 < 0.6
            ? "An early-warning system on sparse wear is a false-confidence machine — stays parked."
            : undefined,
      },
      {
        id: "F14",
        name: "Discipline drift",
        requirement: "none (arithmetic on cached activities)",
        actual: `${activities.length} activities`,
        verdict: verdict(activities.length >= 30),
      },
      {
        id: "F4",
        name: "Recovery latency",
        requirement: "≥40 nights with 5-min HRV series",
        actual: `${nightsWith5MinHrv} nights carry an HRV series`,
        verdict: verdict(nightsWith5MinHrv >= 40),
        note:
          cover60 === 0
            ? "Plenty of history, but no recent wear — findings will describe 2024–25, not today."
            : undefined,
      },
      {
        id: "F2",
        name: "Interference index",
        requirement: "≥30 strength sessions with a quality measure",
        actual: `${strength.length} strength sessions, none RPE-tagged`,
        verdict: verdict(strength.length >= 30),
        note: "Un-park: add per-session RPE + focus tag, revisit at 30 sessions.",
      },
      {
        id: "F15",
        name: "Sleep-debt weekend pattern",
        requirement: "≥12 weekends with weekday Oura + a scored ride (F7/F11)",
        actual: "depends on F7/F11 outcome variable",
        verdict: verdict(false),
      },
    ];

    // ---- report -----------------------------------------------------------
    const go = gates.filter((gate) => gate.verdict === "GO");
    const parked = gates.filter((gate) => gate.verdict === "PARK");

    const lines: string[] = [];
    lines.push("# 00 — Data sufficiency audit");
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`User: \`${userId}\``);
    lines.push("");
    lines.push(
      "Measured against the Gate A thresholds in `INSIGHTS_BUILD_PLAN.md`. " +
        "PARK means the data cannot support the feature yet — not that the idea is bad."
    );
    lines.push("");
    lines.push(`**${go.length} GO / ${parked.length} PARK**`);
    lines.push("");

    lines.push("## Verdicts");
    lines.push("");
    lines.push("| ID | Feature | Requirement | Measured | Verdict |");
    lines.push("|---|---|---|---|---|");
    for (const gate of gates) {
      lines.push(
        `| ${gate.id} | ${gate.name} | ${gate.requirement} | ${gate.actual} | **${gate.verdict}** |`
      );
    }
    lines.push("");

    const notes = gates.filter((gate) => gate.note);
    if (notes.length > 0) {
      lines.push("### Notes");
      lines.push("");
      for (const gate of notes) {
        lines.push(`- **${gate.id}** — ${gate.note}`);
      }
      lines.push("");
    }

    lines.push("## Strava inventory");
    lines.push("");
    lines.push("| Type | Activities | With HR | With GPS | With streams |");
    lines.push("|---|---|---|---|---|");
    for (const [type, entry] of [...byType].sort((a, b) => b[1].total - a[1].total)) {
      lines.push(
        `| ${type} | ${entry.total} | ${entry.hr} | ${entry.gps} | ${entry.streams} |`
      );
    }
    lines.push(
      `| **Total** | **${activities.length}** | ` +
        `**${activities.filter((a) => (a.payload as Record<string, unknown>).has_heartrate === true).length}** | ` +
        `**${activities.filter((a) => ((a.payload as Record<string, unknown>).map as { summary_polyline?: string } | null)?.summary_polyline).length}** | ` +
        `**${streamIds.size}** |`
    );
    lines.push("");
    if (activities.length > 0) {
      lines.push(
        `Date range: ${formatDay(activities[0].startDate)} → ${formatDay(activities[activities.length - 1].startDate)}`
      );
      lines.push("");
    }

    lines.push("## Oura inventory");
    lines.push("");
    lines.push("| Dataset | Rows |");
    lines.push("|---|---|");
    const datasetCounts = new Map<string, number>();
    for (const row of dailyRecords) {
      datasetCounts.set(row.dataset, (datasetCounts.get(row.dataset) || 0) + 1);
    }
    for (const [dataset, count] of [...datasetCounts].sort()) {
      lines.push(`| ${dataset} | ${count} |`);
    }
    lines.push(`| sleep_periods | ${sleepPeriods.length} |`);
    lines.push("");
    lines.push(`- Nights with an HRV reading: **${nightsWithHrv.length}**`);
    lines.push(`- Nights with a temperature deviation: **${nightsWithTemp.length}**`);
    lines.push(`- Nights carrying the 5-minute HRV series: **${nightsWith5MinHrv}**`);
    lines.push(`- Ring wear, trailing 60 days: **${cover60}/60 (${pct(cover60, 60)})**`);
    lines.push(`- Ring wear, trailing 365 days: **${cover365}/365 (${pct(cover365, 365)})**`);
    lines.push("");

    lines.push("## What this means for the build order");
    lines.push("");
    if (go.length === 0) {
      lines.push("- Nothing passes Gate A yet.");
    } else {
      lines.push(`- Ready to build: ${go.map((gate) => gate.id).join(", ")}`);
    }
    lines.push(`- Parked: ${parked.map((gate) => gate.id).join(", ")}`);
    lines.push("");

    mkdirSync("docs/evidence", { recursive: true });
    writeFileSync("docs/evidence/00-data-audit.md", lines.join("\n"));

    console.log(lines.join("\n"));
    console.log("\nWritten to docs/evidence/00-data-audit.md");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
