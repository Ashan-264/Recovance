// Parsing helpers for Garmin CSV exports, shared by the upload API routes and
// the command-line importer so both interpret a file the same way.

export interface GarminActivityRow {
  activityType: string;
  date: Date;
  favorite: boolean;
  title: string | null;
  distance: number | null;
  calories: number | null;
  timeMinutes: number | null;
  avgHr: number | null;
  maxHr: number | null;
  aerobicTe: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  totalAscent: number | null;
  totalDescent: number | null;
  trainingStressScore: number | null;
  totalStrokes: number | null;
  minTemp: number | null;
  decompression: string | null;
  bestLapTime: string | null;
  numberOfLaps: number | null;
  maxTemp: number | null;
  movingTimeMinutes: number | null;
  elapsedTimeMinutes: number | null;
  minElevation: number | null;
  maxElevation: number | null;
}

export interface GarminSleepRow {
  date: Date;
  avgDurationMinutes: number | null;
  avgBedtime: string | null;
  avgWakeTime: string | null;
  originalDateRange: string;
}

/** Splits one CSV line, honouring quoted fields that contain commas. */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // escaped quote
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/** Parses a whole CSV file into data rows, stripping the header and any BOM. */
export function parseCsv(content: string): string[][] {
  return content
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .slice(1)
    .map(splitCsvLine);
}

// Garmin writes "--" for missing values and thousands separators in numbers.
export function parseNumericValue(value: string | undefined): number | null {
  if (!value || value === "--" || value === "") {
    return null;
  }

  const parsed = parseFloat(value.replace(/,/g, ""));
  return isNaN(parsed) ? null : parsed;
}

export function parseIntegerValue(value: string | undefined): number | null {
  const parsed = parseNumericValue(value);
  return parsed === null ? null : Math.round(parsed);
}

export function parseBooleanValue(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

export function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr === "--") {
    return null;
  }

  // Format: "2025-02-02 14:48:43"
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Accepts "01:34:56" (HH:MM:SS), "01:34" (HH:MM), and Garmin's fractional
// seconds form "00:00:04.7".
export function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr || timeStr === "--") {
    return null;
  }

  const parts = timeStr.split(":");

  if (parts.length === 3) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  if (parts.length === 2) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
  }

  return null;
}

export function toActivityRow(row: string[]): GarminActivityRow | null {
  const [
    activityType,
    date,
    favorite,
    title,
    distance,
    calories,
    time,
    avgHr,
    maxHr,
    aerobicTe,
    avgSpeed,
    maxSpeed,
    totalAscent,
    totalDescent,
    trainingStressScore,
    totalStrokes,
    minTemp,
    decompression,
    bestLapTime,
    numberOfLaps,
    maxTemp,
    movingTime,
    elapsedTime,
    minElevation,
    maxElevation,
  ] = row;

  const parsedDate = parseDate(date);

  // Rows without a usable timestamp cannot be identified or deduplicated.
  if (!activityType || !parsedDate) {
    return null;
  }

  return {
    activityType,
    date: parsedDate,
    favorite: parseBooleanValue(favorite),
    title: title || null,
    distance: parseNumericValue(distance),
    calories: parseIntegerValue(calories),
    timeMinutes: parseTimeToMinutes(time),
    avgHr: parseIntegerValue(avgHr),
    maxHr: parseIntegerValue(maxHr),
    aerobicTe: parseNumericValue(aerobicTe),
    avgSpeed: parseNumericValue(avgSpeed),
    maxSpeed: parseNumericValue(maxSpeed),
    totalAscent: parseIntegerValue(totalAscent),
    totalDescent: parseIntegerValue(totalDescent),
    trainingStressScore: parseNumericValue(trainingStressScore),
    totalStrokes: parseIntegerValue(totalStrokes),
    minTemp: parseNumericValue(minTemp),
    decompression: decompression === "--" ? null : decompression || null,
    bestLapTime: bestLapTime === "--" ? null : bestLapTime || null,
    numberOfLaps: parseIntegerValue(numberOfLaps),
    maxTemp: parseNumericValue(maxTemp),
    movingTimeMinutes: parseTimeToMinutes(movingTime),
    elapsedTimeMinutes: parseTimeToMinutes(elapsedTime),
    minElevation: parseIntegerValue(minElevation),
    maxElevation: parseIntegerValue(maxElevation),
  };
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.trim().slice(0, 3).toLowerCase());
}

interface ParsedRange {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  startYear: number | null;
  endYear: number | null;
}

// "Aug 7" / "Aug 7, 2024" -> month + day (+ year when present)
function parseMonthDay(
  part: string
): { month: number; day: number; year: number | null } | null {
  const match = part
    .trim()
    .match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);

  if (!match) {
    return null;
  }

  const month = monthIndex(match[1]);
  if (month === -1) {
    return null;
  }

  return {
    month,
    day: parseInt(match[2], 10),
    year: match[3] ? parseInt(match[3], 10) : null,
  };
}

/**
 * Parses one Garmin weekly range. Handles every form the exports use:
 *   "Aug 7-13"                    same month, year omitted
 *   "Aug 15-21, 2024"             same month, trailing year
 *   "Jul 31 - Aug 6"              spans months, year omitted
 *   "Nov 28 - Dec 4, 2024"        spans months, trailing year
 *   "Dec 26, 2024 - Jan 1, 2025"  spans months and years
 */
export function parseRange(dateRange: string): ParsedRange | null {
  if (!dateRange || dateRange === "--") {
    return null;
  }

  const text = dateRange.trim();

  if (text.includes(" - ")) {
    const [left, right] = text.split(" - ");
    const start = parseMonthDay(left);
    const end = parseMonthDay(right);

    if (!start || !end) {
      return null;
    }

    // A trailing year on the right applies to both sides unless the left
    // carries its own ("Nov 28 - Dec 4, 2024" is entirely in 2024).
    return {
      startMonth: start.month,
      startDay: start.day,
      endMonth: end.month,
      endDay: end.day,
      startYear: start.year ?? (end.month >= start.month ? end.year : null),
      endYear: end.year,
    };
  }

  // Same-month range, with the year optionally trailing: "Dec 19-25, 2024"
  const match = text.match(/^([A-Za-z]+)\s+(\d{1,2})-(\d{1,2})(?:,\s*(\d{4}))?$/);

  if (!match) {
    return null;
  }

  const month = monthIndex(match[1]);
  if (month === -1) {
    return null;
  }

  const year = match[4] ? parseInt(match[4], 10) : null;

  return {
    startMonth: month,
    startDay: parseInt(match[2], 10),
    endMonth: month,
    endDay: parseInt(match[3], 10),
    startYear: year,
    endYear: year,
  };
}

/**
 * Assigns a calendar year to every row of a Garmin sleep export.
 *
 * Garmin lists weeks newest-first and omits the year on recent rows, so a row
 * like "Aug 7-13" is only datable in the context of the rows around it. Walking
 * oldest-to-newest, the year advances whenever the month wraps backwards
 * (Dec -> Jan); explicit years, where present, re-anchor the sequence.
 */
export function resolveYears(
  ranges: (ParsedRange | null)[],
  fallbackYear: number
): (ParsedRange | null)[] {
  const resolved = ranges.map((range) => (range ? { ...range } : null));

  // Anchor on the oldest explicit year; if the file has none, assume the
  // newest row belongs to fallbackYear and count backwards from there.
  let year: number | null = null;
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i]?.startYear != null) {
      year = resolved[i]!.startYear;
      break;
    }
  }

  let previousMonth: number | null = null;

  // Oldest row is last in the file, so iterate upwards through time.
  for (let i = resolved.length - 1; i >= 0; i--) {
    const range = resolved[i];
    if (!range) {
      continue;
    }

    if (range.startYear != null) {
      year = range.startYear;
    } else if (year == null) {
      year = fallbackYear;
    } else if (previousMonth != null && range.startMonth < previousMonth) {
      year += 1; // wrapped from December into January
    }

    range.startYear = year;
    // A range ending in an earlier month than it starts crosses New Year.
    range.endYear =
      range.endYear ??
      (range.endMonth < range.startMonth ? year + 1 : year);

    previousMonth = range.startMonth;
  }

  // Rows newer than every explicit year still need one when the file had none.
  return resolved.map((range) =>
    range && range.startYear == null
      ? { ...range, startYear: fallbackYear, endYear: fallbackYear }
      : range
  );
}

function expandRange(range: ParsedRange): Date[] {
  if (range.startYear == null || range.endYear == null) {
    return [];
  }

  // UTC keeps a date column from drifting a day in negative timezones.
  const start = new Date(
    Date.UTC(range.startYear, range.startMonth, range.startDay)
  );
  const end = new Date(Date.UTC(range.endYear, range.endMonth, range.endDay));

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

// Parse "6h 34min" into total minutes.
export function parseDuration(duration: string | undefined): number | null {
  if (!duration || duration === "--") {
    return null;
  }

  const hours = parseInt(duration.match(/(\d+)h/)?.[1] ?? "0") || 0;
  const minutes = parseInt(duration.match(/(\d+)min/)?.[1] ?? "0") || 0;
  const total = hours * 60 + minutes;

  return total > 0 ? total : null;
}

const SLEEP_COLUMNS = 4; // Date, Avg Duration, Avg Bedtime, Avg Wake Time

/**
 * Repairs a sleep row split on commas.
 *
 * Garmin does not quote the Date column even though it contains commas
 * ("Aug 15-21, 2024" and "Dec 26, 2024 - Jan 1, 2025"), so a comma split
 * yields extra fields. Any surplus belongs to the date; rejoin it.
 */
export function normalizeSleepRow(fields: string[]): string[] {
  if (fields.length <= SLEEP_COLUMNS) {
    return fields;
  }

  const surplus = fields.length - SLEEP_COLUMNS;

  return [
    fields
      .slice(0, surplus + 1)
      .map((part) => part.trim())
      .join(", "),
    ...fields.slice(surplus + 1),
  ];
}

/**
 * Converts a whole Garmin sleep export into one row per day.
 *
 * Takes every row at once because a row's year can only be resolved from the
 * rows around it (see resolveYears). Later rows win when weeks overlap, so the
 * result is safe to upsert on `date`.
 */
export function toSleepRows(
  rawRows: string[][],
  fallbackYear: number
): GarminSleepRow[] {
  const rows = rawRows.map(normalizeSleepRow);
  const ranges = resolveYears(
    rows.map((row) => parseRange(row[0])),
    fallbackYear
  );

  const byDate = new Map<string, GarminSleepRow>();

  ranges.forEach((range, index) => {
    if (!range) {
      return;
    }

    const [dateRange, avgDuration, avgBedtime, avgWakeTime] = rows[index];
    const durationMinutes = parseDuration(avgDuration);

    expandRange(range).forEach((date) => {
      byDate.set(date.toISOString(), {
        date,
        avgDurationMinutes: durationMinutes,
        avgBedtime: avgBedtime === "--" ? null : avgBedtime || null,
        avgWakeTime: avgWakeTime === "--" ? null : avgWakeTime || null,
        originalDateRange: dateRange,
      });
    });
  });

  return Array.from(byDate.values());
}
