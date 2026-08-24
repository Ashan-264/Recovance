/**
 * P0-1 — Backfill every Oura dataset over the full history.
 *
 *   npx tsx scripts/insights/backfill-oura.ts [--from 2021-05-01] [--to 2026-08-11]
 *
 * Goes through the read-through cache, so it only requests date ranges that
 * have never been fetched. Safe and cheap to re-run.
 */
import {
  getOuraDaily,
  getOuraSleepPeriods,
  OURA_DAILY_DATASETS,
} from "../../src/lib/ouraCache";
import { arg, createClient, formatDay, parseDay, resolveUserId } from "./_client";

// Oura's API is happiest with bounded windows; 90 days keeps responses small
// and means an interruption loses at most one chunk of progress.
const CHUNK_DAYS = 90;

function chunks(from: Date, to: Date): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setUTCDate(end.getUTCDate() + CHUNK_DAYS - 1);
    out.push({ start, end: end > to ? new Date(to) : end });
    cursor.setUTCDate(cursor.getUTCDate() + CHUNK_DAYS);
  }

  return out;
}

async function main() {
  const prisma = createClient();

  try {
    const userId = await resolveUserId(prisma);
    const from = parseDay(arg("--from") || "2021-05-01");
    const to = parseDay(arg("--to") || formatDay(new Date()));
    const windows = chunks(from, to);

    console.log(
      `Backfilling Oura for user ${userId}: ${formatDay(from)} → ${formatDay(to)} (${windows.length} chunks)\n`
    );

    for (const dataset of OURA_DAILY_DATASETS) {
      let rows = 0;
      let fetched = 0;

      for (const window of windows) {
        try {
          const result = await getOuraDaily(
            userId,
            dataset,
            formatDay(window.start),
            formatDay(window.end)
          );
          rows += result.data.length;
          fetched += result.fetchedRanges.length;
        } catch (error) {
          console.error(
            `  ${dataset} ${formatDay(window.start)}: ${(error as Error).message}`
          );
        }
      }

      console.log(`${dataset.padEnd(18)} ${String(rows).padStart(5)} rows  (${fetched} ranges fetched)`);
    }

    let periods = 0;
    let periodFetches = 0;
    for (const window of windows) {
      try {
        const result = await getOuraSleepPeriods(
          userId,
          formatDay(window.start),
          formatDay(window.end)
        );
        periods += result.data.length;
        periodFetches += result.fetchedRanges.length;
      } catch (error) {
        console.error(`  sleep_periods ${formatDay(window.start)}: ${(error as Error).message}`);
      }
    }
    console.log(`${"sleep_periods".padEnd(18)} ${String(periods).padStart(5)} rows  (${periodFetches} ranges fetched)`);

    const [daily, sleepPeriods] = await Promise.all([
      prisma.ouraDailyRecord.count({ where: { userId } }),
      prisma.ouraSleepPeriod.count({ where: { userId } }),
    ]);

    console.log(`\nStored: ${daily} daily records, ${sleepPeriods} sleep periods.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
