import { prisma } from "./prisma";

export interface DateRange {
  start: Date;
  end: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toUtcDay(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Subtracts already-cached ranges from the requested range, returning only the
 * gaps that still need fetching.
 *
 * Ranges are inclusive of both endpoints, so two ranges that touch across a
 * single day boundary (…-09 and -10-…) leave no gap between them.
 */
export function missingRanges(
  requested: DateRange,
  covered: DateRange[]
): DateRange[] {
  const sorted = [...covered]
    .map((range) => ({ start: toUtcDay(range.start), end: toUtcDay(range.end) }))
    .filter((range) => range.end >= requested.start && range.start <= requested.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const gaps: DateRange[] = [];
  let cursor = toUtcDay(requested.start);
  const finish = toUtcDay(requested.end);

  for (const range of sorted) {
    if (range.start > cursor) {
      gaps.push({ start: cursor, end: addDays(range.start, -1) });
    }
    if (range.end >= cursor) {
      cursor = addDays(range.end, 1);
    }
    if (cursor > finish) {
      return gaps;
    }
  }

  if (cursor <= finish) {
    gaps.push({ start: cursor, end: finish });
  }

  return gaps;
}

/** Merges overlapping or adjacent ranges into the smallest equivalent set. */
export function mergeRanges(ranges: DateRange[]): DateRange[] {
  const sorted = [...ranges]
    .map((range) => ({ start: toUtcDay(range.start), end: toUtcDay(range.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: DateRange[] = [];

  for (const range of sorted) {
    const previous = merged[merged.length - 1];

    // Adjacent (previous ends the day before this starts) counts as contiguous.
    if (previous && range.start <= addDays(previous.end, 1)) {
      if (range.end > previous.end) {
        previous.end = range.end;
      }
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

export async function getCoveredRanges(
  userId: string,
  dataset: string
): Promise<DateRange[]> {
  const rows = await prisma.syncRange.findMany({
    where: { userId, dataset },
    select: { start: true, end: true },
  });

  return rows.map((row) => ({ start: row.start, end: row.end }));
}

/**
 * Records that a range is now cached, collapsing the dataset's ranges into
 * their merged form so the table cannot grow unbounded.
 */
export async function recordCoverage(
  userId: string,
  dataset: string,
  range: DateRange
): Promise<void> {
  const existing = await getCoveredRanges(userId, dataset);
  const merged = mergeRanges([...existing, range]);

  await prisma.$transaction([
    prisma.syncRange.deleteMany({ where: { userId, dataset } }),
    prisma.syncRange.createMany({
      data: merged.map((entry) => ({
        userId,
        dataset,
        start: entry.start,
        end: entry.end,
      })),
    }),
  ]);
}
