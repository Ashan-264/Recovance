import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  RunOnTrail,
  descentSkill,
  fearArousal,
  matchTrails,
  trailProgression,
} from "./trailFeatures";

function run(overrides: Partial<RunOnTrail>): RunOnTrail {
  return {
    trailKey: "33.75,-84.39|33.74,-84.38|8",
    startLatLng: [33.75, -84.39],
    endLatLng: [33.74, -84.38],
    seconds: 300,
    distanceMetres: 2000,
    verticalMetres: 200,
    medianSpeed: 7,
    speedCv: 0.4,
    decelPerKm: 10,
    meanHr: 150,
    rideP10Hr: 100,
    day: "2025-01-01",
    rideType: "MountainBikeRide",
    ...overrides,
  };
}

test("matchTrails groups by key and keeps only repeated trails", () => {
  const trails = matchTrails([
    run({ day: "2025-01-01" }),
    run({ day: "2025-02-01" }),
    run({ day: "2025-03-01" }),
    run({ trailKey: "other|other|4", day: "2025-01-05" }), // ridden once
    run({ trailKey: null, day: "2025-01-06" }), // no GPS
  ]);

  assert.equal(trails.length, 1);
  assert.equal(trails[0].runs.length, 3);
  // Chronological order regardless of input order.
  assert.equal(trails[0].runs[0].day, "2025-01-01");
});

test("descentSkill reports improving braking as a negative change", () => {
  // Nine runs, decel/km falling 14 → 6: clearly smoother over time.
  const runs = Array.from({ length: 9 }, (_, index) =>
    run({
      day: `2025-0${index + 1}-01`,
      decelPerKm: 14 - index,
      seconds: 320 - index * 5,
    })
  );

  const result = descentSkill(matchTrails(runs));

  assert.equal(result.trails, 1);
  assert.ok(
    result.medianBrakingChange === null || result.medianBrakingChange < 0,
    `braking should trend down, got ${result.medianBrakingChange}`
  );
  // Only one trail -> below the 3-trail floor for the headline number.
  assert.equal(result.medianBrakingChange, null);
});

test("descentSkill headline appears with three trails and is negative when improving", () => {
  const mkTrail = (key: string) =>
    Array.from({ length: 6 }, (_, index) =>
      run({
        trailKey: key,
        day: `2025-0${index + 1}-01`,
        decelPerKm: 12 - index,
      })
    );

  const result = descentSkill(
    matchTrails([...mkTrail("a|a|1"), ...mkTrail("b|b|2"), ...mkTrail("c|c|3")])
  );

  assert.equal(result.trails, 3);
  assert.ok(result.medianBrakingChange !== null);
  assert.ok(result.medianBrakingChange! < 0);
  // Monotonic sequences correlate strongly run-to-run.
  assert.ok(result.reliability !== null);
  assert.ok(result.reliability!.rho > 0.5);
});

test("fearArousal falls as a trail becomes familiar", () => {
  const mk = (key: string) =>
    Array.from({ length: 6 }, (_, index) =>
      run({
        trailKey: key,
        day: `2025-0${index + 1}-01`,
        meanHr: 165 - index * 5, // descending HR across repeats
        rideP10Hr: 100,
      })
    );

  const result = fearArousal(matchTrails([...mk("a|a|1"), ...mk("b|b|2")]));

  assert.equal(result.trails, 2);
  assert.ok(result.changeBpm !== null && result.changeBpm < 0);
});

test("trailProgression separates skill from fitness", () => {
  // Skill trail: much faster, same HR.
  const skill = Array.from({ length: 6 }, (_, index) =>
    run({
      trailKey: "skill|s|1",
      day: `2025-0${index + 1}-01`,
      seconds: 360 - index * 20,
      meanHr: 150,
    })
  );
  // Fitness trail: same time, much lower HR.
  const fitness = Array.from({ length: 6 }, (_, index) =>
    run({
      trailKey: "fit|f|1",
      day: `2025-0${index + 1}-01`,
      seconds: 300,
      meanHr: 160 - index * 4,
    })
  );

  const result = trailProgression(matchTrails([...skill, ...fitness]));

  const kinds = Object.fromEntries(
    result.trails.map((trail) => [trail.key, trail.kind])
  );
  assert.equal(kinds["skill|s|1"], "skill");
  assert.equal(kinds["fit|f|1"], "fitness");
});
