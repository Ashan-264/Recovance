import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  baselinesFor,
  buildNightlyReadings,
  deviation,
  median,
  medianAbsoluteDeviation,
  NightlyReading,
  percentile,
  rollingBaseline,
} from "./baselines";

const EPOCH = Date.UTC(2025, 5, 1); // 2025-06-01

/** Day `offset` days after 2025-06-01, rolling over month ends correctly. */
function dayAt(offset: number): string {
  return new Date(EPOCH + offset * 86_400_000).toISOString().slice(0, 10);
}

function nights(values: (number | null)[], startOffset = 0): NightlyReading[] {
  return values.map((hrv, index) => ({
    day: dayAt(startOffset + index),
    hrv,
    restingHr: null,
    sleepHours: null,
    deepHours: null,
    remHours: null,
    efficiency: null,
    tempDeviation: null,
    readinessScore: null,
    sleepScore: null,
  }));
}

test("median and MAD resist a single outlier", () => {
  assert.equal(median([1, 2, 3, 4, 5]), 3);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  // One wild night must not move the centre.
  assert.equal(median([50, 52, 51, 53, 500]), 52);
  assert.equal(medianAbsoluteDeviation([50, 52, 51, 53, 500]), 1);
});

test("percentile interpolates", () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 50), 3);
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
  assert.equal(percentile([10, 20], 20), 12);
});

test("baseline excludes the day it describes", () => {
  // 12 nights at 50, then a crash to 20 on the 13th.
  const readings = nights([...Array(12).fill(50), 20]);
  const baseline = rollingBaseline(readings, dayAt(12), "hrv");

  assert.ok(baseline);
  // If the crash night leaked into its own baseline the median would drop.
  assert.equal(baseline!.median, 50);
  assert.equal(baseline!.n, 12);
});

test("baseline returns null below the minimum sample", () => {
  const readings = nights([50, 51, 52]);
  assert.equal(rollingBaseline(readings, dayAt(9), "hrv"), null);
});

test("missing nights are skipped, never interpolated", () => {
  const readings = nights([50, null, 52, null, 48, 51, 49, 50, 52, 51, 50, 49]);
  const baseline = rollingBaseline(readings, dayAt(12), "hrv", 30, 5);

  assert.ok(baseline);
  // 12 nights listed, 2 absent -> baseline sees 10, not 12.
  assert.equal(baseline!.n, 10);
});

test("baseline window does not reach past windowDays", () => {
  const readings = nights(Array(40).fill(50));
  const baseline = rollingBaseline(readings, dayAt(39), "hrv", 30);
  assert.ok(baseline);
  assert.ok(baseline!.n <= 30);
});

test("deviation is expressed in MAD units and survives a flat window", () => {
  assert.equal(deviation(40, { median: 50, mad: 5, n: 20 }), -2);
  assert.equal(deviation(null, { median: 50, mad: 5, n: 20 }), null);
  assert.equal(deviation(50, null), null);
  // A perfectly flat window must not divide by zero.
  assert.equal(deviation(50, { median: 50, mad: 0, n: 20 }), 0);
  assert.equal(deviation(60, { median: 50, mad: 0, n: 20 }), Infinity);
});

test("naps never become the night's reading", () => {
  const readings = buildNightlyReadings({
    sleepPeriods: [
      { day: "2025-06-01", type: "long_sleep", average_hrv: 55, total_sleep_duration: 27000 },
      { day: "2025-06-01", type: "sleep", average_hrv: 20, total_sleep_duration: 1200 },
    ],
    readiness: [{ day: "2025-06-01", score: 80, temperature_deviation: 0.2 }],
    dailySleep: [{ day: "2025-06-01", score: 74 }],
  });

  assert.equal(readings.length, 1);
  assert.equal(readings[0].hrv, 55, "the 20-minute nap must not win");
  assert.equal(readings[0].sleepHours, 7.5);
  assert.equal(readings[0].tempDeviation, 0.2);
  assert.equal(readings[0].sleepScore, 74);
});

test("falls back to the longest period when nothing is marked long_sleep", () => {
  const readings = buildNightlyReadings({
    sleepPeriods: [
      { day: "2025-06-02", type: "sleep", average_hrv: 30, total_sleep_duration: 3600 },
      { day: "2025-06-02", type: "sleep", average_hrv: 44, total_sleep_duration: 18000 },
    ],
    readiness: [],
    dailySleep: [],
  });

  assert.equal(readings[0].hrv, 44);
});

test("a day with readiness but no sleep still yields a reading", () => {
  const readings = buildNightlyReadings({
    sleepPeriods: [],
    readiness: [{ day: "2025-06-03", score: 61, temperature_deviation: 0.7 }],
    dailySleep: [],
  });

  assert.equal(readings.length, 1);
  assert.equal(readings[0].hrv, null);
  assert.equal(readings[0].readinessScore, 61);
});

test("baselinesFor only reports metrics with enough data", () => {
  const readings = nights(Array(15).fill(50)).map((reading, index) => ({
    ...reading,
    restingHr: index < 3 ? 48 : null, // too sparse to qualify
  }));

  const set = baselinesFor(readings, dayAt(15));
  assert.ok(set.hrv, "hrv has 15 readings");
  assert.equal(set.restingHr, undefined, "restingHr has only 3");
});
