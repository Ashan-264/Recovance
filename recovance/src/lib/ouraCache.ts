import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { getProviderToken } from "./providerAccounts";
import {
  DateRange,
  formatDay,
  getCoveredRanges,
  missingRanges,
  recordCoverage,
  toUtcDay,
} from "./syncRanges";

// Oura daily collections this app reads. `dataset` doubles as the cache key
// and the API path segment.
export const OURA_DAILY_DATASETS = [
  "daily_sleep",
  "daily_readiness",
  "daily_activity",
  "daily_stress",
  "daily_resilience",
] as const;

export type OuraDailyDataset = (typeof OURA_DAILY_DATASETS)[number];

export interface OuraFetchResult {
  data: Record<string, unknown>[];
  servedFromCache: boolean;
  fetchedRanges: string[];
}

export class OuraUnavailableError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OuraUnavailableError";
    this.status = status;
  }
}

interface OuraDocument {
  id?: string;
  day?: string;
  [key: string]: unknown;
}

async function callOura(
  token: string,
  path: string,
  range: DateRange
): Promise<OuraDocument[]> {
  const documents: OuraDocument[] = [];
  let nextToken: string | null = null;

  // Oura pages with an opaque next_token; keep going until it stops.
  do {
    const url = new URL(`https://api.ouraring.com/v2/usercollection/${path}`);
    url.searchParams.set("start_date", formatDay(range.start));
    url.searchParams.set("end_date", formatDay(range.end));
    if (nextToken) {
      url.searchParams.set("next_token", nextToken);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new OuraUnavailableError(
        `Oura API error: ${await response.text()}`,
        response.status
      );
    }

    const body = await response.json();
    documents.push(...((body.data as OuraDocument[]) || []));
    nextToken = body.next_token || null;
  } while (nextToken);

  return documents;
}

/**
 * Reads an Oura daily collection for a date range, serving cached rows and
 * fetching only the parts that have never been fetched.
 *
 * Coverage is tracked separately from the rows themselves: a day with no data
 * (a night you did not wear the ring) is legitimately empty, and without the
 * coverage record it would be re-requested on every page load.
 */
export async function getOuraDaily(
  userId: string,
  dataset: OuraDailyDataset,
  startDate: string,
  endDate: string
): Promise<OuraFetchResult> {
  const requested: DateRange = {
    start: toUtcDay(startDate),
    end: toUtcDay(endDate),
  };

  if (requested.end < requested.start) {
    throw new OuraUnavailableError("end_date is before start_date", 400);
  }

  const covered = await getCoveredRanges(userId, `oura:${dataset}`);
  const gaps = missingRanges(requested, covered);
  const fetchedRanges: string[] = [];

  if (gaps.length > 0) {
    const token = await getProviderToken(userId, "oura");

    if (!token) {
      // Nothing to fetch with. Serve whatever is cached rather than failing
      // outright, so a partially warmed cache still renders.
      const cachedOnly = await readCached(userId, dataset, requested);
      if (cachedOnly.length > 0) {
        return { data: cachedOnly, servedFromCache: true, fetchedRanges: [] };
      }

      throw new OuraUnavailableError(
        "No Oura credentials. Connect Oura at /connect or set OURA_API_TOKEN.",
        503
      );
    }

    for (const gap of gaps) {
      const documents = await callOura(token.accessToken, dataset, gap);

      const rows = documents
        .filter((doc) => typeof doc.day === "string")
        .map((doc) => ({
          userId,
          dataset,
          day: toUtcDay(doc.day as string),
          payload: doc as Prisma.InputJsonValue,
        }));

      if (rows.length > 0) {
        await prisma.$transaction(
          rows.map((row) =>
            prisma.ouraDailyRecord.upsert({
              where: {
                userId_dataset_day: {
                  userId: row.userId,
                  dataset: row.dataset,
                  day: row.day,
                },
              },
              create: row,
              update: { payload: row.payload, fetchedAt: new Date() },
            })
          )
        );
      }

      // Mark the gap covered even when it returned nothing.
      await recordCoverage(userId, `oura:${dataset}`, gap);
      fetchedRanges.push(`${formatDay(gap.start)}..${formatDay(gap.end)}`);
    }
  }

  return {
    data: await readCached(userId, dataset, requested),
    servedFromCache: gaps.length === 0,
    fetchedRanges,
  };
}

async function readCached(
  userId: string,
  dataset: string,
  range: DateRange
): Promise<Record<string, unknown>[]> {
  const rows = await prisma.ouraDailyRecord.findMany({
    where: { userId, dataset, day: { gte: range.start, lte: range.end } },
    orderBy: { day: "asc" },
    select: { payload: true },
  });

  return rows.map((row) => row.payload as Record<string, unknown>);
}

/** Same read-through behaviour for individual sleep periods. */
export async function getOuraSleepPeriods(
  userId: string,
  startDate: string,
  endDate: string
): Promise<OuraFetchResult> {
  const requested: DateRange = {
    start: toUtcDay(startDate),
    end: toUtcDay(endDate),
  };

  const dataset = "oura:sleep_periods";
  const covered = await getCoveredRanges(userId, dataset);
  const gaps = missingRanges(requested, covered);
  const fetchedRanges: string[] = [];

  if (gaps.length > 0) {
    const token = await getProviderToken(userId, "oura");

    if (!token) {
      const cachedOnly = await readCachedPeriods(userId, requested);
      if (cachedOnly.length > 0) {
        return { data: cachedOnly, servedFromCache: true, fetchedRanges: [] };
      }
      throw new OuraUnavailableError(
        "No Oura credentials. Connect Oura at /connect or set OURA_API_TOKEN.",
        503
      );
    }

    for (const gap of gaps) {
      const documents = await callOura(token.accessToken, "sleep", gap);

      const rows = documents
        .filter((doc) => typeof doc.id === "string" && typeof doc.day === "string")
        .map((doc) => ({
          userId,
          ouraId: doc.id as string,
          day: toUtcDay(doc.day as string),
          payload: doc as Prisma.InputJsonValue,
        }));

      if (rows.length > 0) {
        await prisma.$transaction(
          rows.map((row) =>
            prisma.ouraSleepPeriod.upsert({
              where: { userId_ouraId: { userId: row.userId, ouraId: row.ouraId } },
              create: row,
              update: { payload: row.payload, fetchedAt: new Date() },
            })
          )
        );
      }

      await recordCoverage(userId, dataset, gap);
      fetchedRanges.push(`${formatDay(gap.start)}..${formatDay(gap.end)}`);
    }
  }

  return {
    data: await readCachedPeriods(userId, requested),
    servedFromCache: gaps.length === 0,
    fetchedRanges,
  };
}

async function readCachedPeriods(
  userId: string,
  range: DateRange
): Promise<Record<string, unknown>[]> {
  const rows = await prisma.ouraSleepPeriod.findMany({
    where: { userId, day: { gte: range.start, lte: range.end } },
    orderBy: { day: "asc" },
    select: { payload: true },
  });

  return rows.map((row) => row.payload as Record<string, unknown>);
}
