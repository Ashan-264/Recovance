import { strict as assert } from "node:assert";
import { test } from "node:test";
import { RideStreams, computeLoadSplit, streamsFromPayload } from "./loadSplit";

/** Builds a synthetic 1 Hz ride from a list of (seconds, grade) legs. */
function ride(legs: { seconds: number; grade: number; hr?: number }[]): RideStreams {
  const time: number[] = [];
  const altitude: number[] = [];
  const gradeSmooth: number[] = [];
  const velocitySmooth: number[] = [];
  const heartrate: number[] = [];

  let t = 0;
  let alt = 100;

  for (const leg of legs) {
    for (let i = 0; i < leg.seconds; i++) {
      time.push(t);
      altitude.push(alt);
      gradeSmooth.push(leg.grade);
      velocitySmooth.push(5); // 5 m/s
      heartrate.push(leg.hr ?? 140);
      // 5 m of travel per second at the given grade.
      alt += (leg.grade / 100) * 5;
      t += 1;
    }
  }

  return { time, altitude, gradeSmooth, velocitySmooth, heartrate };
}

test("a flat ride produces no climb or descent load", () => {
  const split = computeLoadSplit(ride([{ seconds: 600, grade: 0 }]));

  assert.ok(split);
  assert.equal(split!.climbSeconds, 0);
  assert.equal(split!.descentSeconds, 0);
  assert.ok(split!.flatSeconds > 500);
  assert.equal(split!.descentShare, 0);
});

test("a pure climb registers as climbing with vertical gain", () => {
  const split = computeLoadSplit(ride([{ seconds: 600, grade: 8 }]));

  assert.ok(split);
  assert.ok(split!.climbSeconds > 500);
  assert.equal(split!.descentSeconds, 0);
  assert.ok(split!.verticalClimb > 200, "should record the metres gained");
  assert.equal(split!.descentShare, 0);
});

test("a shuttle day is dominated by descending load", () => {
  // Short transfer up, long steep descent, repeated — the shuttle pattern.
  const split = computeLoadSplit(
    ride([
      { seconds: 120, grade: 6 },
      { seconds: 600, grade: -12 },
      { seconds: 120, grade: 6 },
      { seconds: 600, grade: -12 },
    ])
  );

  assert.ok(split);
  assert.ok(split!.descentSeconds > split!.climbSeconds);
  assert.ok(
    split!.descentShare !== null && split!.descentShare > 0.6,
    `expected a descent-dominated ride, got ${split!.descentShare}`
  );
  assert.equal(split!.descentCount, 2, "two separate descents");
  assert.ok(split!.verticalDescent > 500);
});

test("an XC loop with equal up and down is not descent-dominated", () => {
  const split = computeLoadSplit(
    ride([
      { seconds: 900, grade: 5, hr: 170 },
      { seconds: 900, grade: -5, hr: 120 },
    ])
  );

  assert.ok(split);
  assert.ok(
    split!.descentShare !== null && split!.descentShare < 0.5,
    `a balanced loop should not read as technical, got ${split!.descentShare}`
  );
});

test("brief dips inside a climb do not become their own descent", () => {
  const split = computeLoadSplit(
    ride([
      { seconds: 300, grade: 7 },
      { seconds: 10, grade: -5 }, // 10s dip, below the 30s minimum
      { seconds: 300, grade: 7 },
    ])
  );

  assert.ok(split);
  assert.equal(split!.descentCount, 0, "the 10s dip should be absorbed");
});

test("returns null without altitude rather than guessing", () => {
  assert.equal(computeLoadSplit({ time: [0, 1, 2] }), null);
  assert.equal(computeLoadSplit({}), null);
});

test("paused samples are excluded from the totals", () => {
  const base = ride([{ seconds: 600, grade: 0 }]);
  const withPause: RideStreams = {
    ...base,
    moving: base.time!.map((_, index) => index > 300),
  };

  const split = computeLoadSplit(withPause);
  assert.ok(split);
  assert.ok(
    split!.flatSeconds < 320,
    `paused half should be dropped, got ${split!.flatSeconds}s`
  );
});

test("gaps in recording do not inflate durations", () => {
  // Two 30-second blocks separated by a two-hour pause in recording. The gap
  // must not be counted as two hours of riding.
  const time: number[] = [];
  for (let i = 0; i < 30; i++) time.push(i);
  for (let i = 0; i < 30; i++) time.push(7200 + i);

  const flat = new Array(time.length).fill(0);
  const split = computeLoadSplit({
    time,
    altitude: new Array(time.length).fill(100),
    gradeSmooth: flat,
    velocitySmooth: new Array(time.length).fill(5),
  });

  assert.ok(split);
  assert.ok(
    split!.flatSeconds < 70,
    `only the two recorded blocks should count, got ${split!.flatSeconds}s`
  );
});

test("grade is derived from altitude when Strava omits it", () => {
  const withGrade = ride([{ seconds: 600, grade: 10 }]);
  const withoutGrade: RideStreams = { ...withGrade, gradeSmooth: undefined };

  const split = computeLoadSplit(withoutGrade);
  assert.ok(split);
  assert.ok(split!.climbSeconds > 400, "should still detect the climb");
});

test("streamsFromPayload reads Strava's key_by_type shape", () => {
  const parsed = streamsFromPayload({
    time: { data: [0, 1, 2] },
    altitude: { data: [10, 11, 12] },
    grade_smooth: { data: [1, 2, 3] },
    heartrate: { data: [100, 101, 102] },
    moving: { data: [true, true, false] },
    latlng: { data: [[1, 2]] },
  });

  assert.deepEqual(parsed.time, [0, 1, 2]);
  assert.deepEqual(parsed.gradeSmooth, [1, 2, 3]);
  assert.deepEqual(parsed.moving, [true, true, false]);
  assert.equal(parsed.velocitySmooth, undefined);
});
