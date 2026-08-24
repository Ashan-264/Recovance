/**
 * F12 — Technical vs aerobic load split.
 *
 * A two-hour shuttle day and a two-hour XC loop produce the same Strava
 * "Relative Effort", but they are not the same stress: one is mostly aerobic
 * work going up, the other mostly neuromuscular and grip load coming down.
 * This splits a ride's stream into climbing, descending and flat segments and
 * scores each separately.
 *
 * The descent score is explicitly a heuristic — time weighted by steepness, not
 * a measured force — so it is reported as an index, never as a physiological
 * unit it has not earned.
 */

export interface RideStreams {
  time?: number[]; // seconds from start
  distance?: number[]; // cumulative metres
  altitude?: number[]; // metres
  gradeSmooth?: number[]; // percent
  velocitySmooth?: number[]; // m/s
  heartrate?: number[]; // bpm
  moving?: boolean[];
}

export type SegmentKind = "climb" | "descent" | "flat";

export interface Segment {
  kind: SegmentKind;
  startIndex: number;
  endIndex: number;
  seconds: number;
  verticalMetres: number; // positive on climbs, negative on descents
  meanGrade: number;
  meanHeartrate: number | null;
}

export interface LoadSplit {
  climbSeconds: number;
  descentSeconds: number;
  flatSeconds: number;
  verticalClimb: number;
  verticalDescent: number; // positive metres descended
  climbLoad: number;
  descentLoad: number;
  flatLoad: number;
  /** Share of total load that is descending — the "technical" fraction. */
  descentShare: number | null;
  descentCount: number;
  usedHeartrate: boolean;
  segments: Segment[];
}

/** Grade beyond which a sample counts as climbing or descending. */
const GRADE_THRESHOLD = 3;
/** Segments shorter than this are absorbed into their neighbour. */
const MIN_SEGMENT_SECONDS = 30;

function classify(grade: number): SegmentKind {
  if (grade >= GRADE_THRESHOLD) return "climb";
  if (grade <= -GRADE_THRESHOLD) return "descent";
  return "flat";
}

/**
 * Derives grade from altitude when Strava does not supply grade_smooth.
 * Uses a window so GPS altitude jitter does not read as constant 20% ramps.
 */
function deriveGrade(
  altitude: number[],
  time: number[],
  velocity: number[] | undefined,
  distance: number[] | undefined
): number[] {
  const grades = new Array<number>(altitude.length).fill(0);
  const window = 5;

  for (let i = 0; i < altitude.length; i++) {
    const from = Math.max(0, i - window);
    const to = Math.min(altitude.length - 1, i + window);
    const rise = altitude[to] - altitude[from];

    // Horizontal run: cumulative distance is the most direct source; velocity
    // integration is the fallback. Without either the grade is unknowable and
    // stays 0 rather than being invented.
    let run = 0;
    if (distance && distance.length === altitude.length) {
      run = distance[to] - distance[from];
    } else if (velocity) {
      for (let j = from; j < to; j++) {
        const dt = (time[j + 1] ?? time[j]) - time[j];
        run += (velocity[j] ?? 0) * dt;
      }
    }

    grades[i] = run > 1 ? (rise / run) * 100 : 0;
  }

  return grades;
}

/**
 * Splits a ride into climb/descent/flat segments and scores each.
 *
 * Returns null when the stream lacks what the split needs, rather than
 * guessing — a ride with no altitude cannot be divided this way.
 */
export function computeLoadSplit(streams: RideStreams): LoadSplit | null {
  const time = streams.time;
  const altitude = streams.altitude;

  if (!time || time.length < 10 || !altitude || altitude.length !== time.length) {
    return null;
  }

  const grade =
    streams.gradeSmooth && streams.gradeSmooth.length === time.length
      ? streams.gradeSmooth
      : deriveGrade(altitude, time, streams.velocitySmooth, streams.distance);

  const heartrate =
    streams.heartrate && streams.heartrate.length === time.length
      ? streams.heartrate
      : null;
  const moving = streams.moving;

  // Pass 1: raw classification per sample.
  const kinds = grade.map(classify);

  // Pass 2: collapse into runs, then absorb runs shorter than the minimum so a
  // brief dip inside a climb does not become its own "descent".
  const runs: { kind: SegmentKind; start: number; end: number }[] = [];
  for (let i = 0; i < kinds.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.kind === kinds[i]) {
      last.end = i;
    } else {
      runs.push({ kind: kinds[i], start: i, end: i });
    }
  }

  const merged: typeof runs = [];
  for (const run of runs) {
    const seconds = time[run.end] - time[run.start];
    const previous = merged[merged.length - 1];

    if (seconds < MIN_SEGMENT_SECONDS && previous) {
      previous.end = run.end; // absorb into the preceding segment
    } else {
      merged.push({ ...run });
    }
  }

  // Pass 3: score each segment.
  const segments: Segment[] = [];
  let climbSeconds = 0;
  let descentSeconds = 0;
  let flatSeconds = 0;
  let verticalClimb = 0;
  let verticalDescent = 0;
  let climbLoad = 0;
  let descentLoad = 0;
  let flatLoad = 0;

  // Heart-rate reserve needs anchors; use the ride's own range so no
  // per-athlete configuration is required.
  const hrValues = heartrate ? heartrate.filter((value) => value > 0) : [];
  const hrMin = hrValues.length > 0 ? Math.min(...hrValues) : 0;
  const hrMax = hrValues.length > 0 ? Math.max(...hrValues) : 0;
  const hrRange = hrMax - hrMin;
  const usedHeartrate = hrRange > 20; // too flat a range means unusable HR

  for (const run of merged) {
    let seconds = 0;
    let hrSum = 0;
    let hrCount = 0;
    let gradeSum = 0;
    let gradeCount = 0;
    let load = 0;

    for (let i = run.start; i < run.end; i++) {
      const dt = time[i + 1] - time[i];
      if (dt <= 0 || dt > 60) {
        continue; // pause or gap in recording
      }
      if (moving && moving[i] === false) {
        continue;
      }

      seconds += dt;
      gradeSum += grade[i];
      gradeCount++;

      if (heartrate && heartrate[i] > 0) {
        hrSum += heartrate[i];
        hrCount++;
      }

      if (run.kind === "descent") {
        // Steeper descending is more demanding on grip, arms and attention.
        // Capped at 15% so one GPS spike cannot dominate the ride.
        load += dt * Math.min(1, Math.abs(grade[i]) / 15);
      } else {
        // Aerobic segments scale with heart-rate reserve when available.
        const intensity =
          usedHeartrate && heartrate && heartrate[i] > 0
            ? (heartrate[i] - hrMin) / hrRange
            : 0.5;
        load += dt * intensity;
      }
    }

    if (seconds === 0) {
      continue;
    }

    const vertical = altitude[run.end] - altitude[run.start];

    segments.push({
      kind: run.kind,
      startIndex: run.start,
      endIndex: run.end,
      seconds,
      verticalMetres: vertical,
      meanGrade: gradeCount > 0 ? gradeSum / gradeCount : 0,
      meanHeartrate: hrCount > 0 ? hrSum / hrCount : null,
    });

    if (run.kind === "climb") {
      climbSeconds += seconds;
      verticalClimb += Math.max(0, vertical);
      climbLoad += load;
    } else if (run.kind === "descent") {
      descentSeconds += seconds;
      verticalDescent += Math.max(0, -vertical);
      descentLoad += load;
    } else {
      flatSeconds += seconds;
      flatLoad += load;
    }
  }

  const totalLoad = climbLoad + descentLoad + flatLoad;

  return {
    climbSeconds,
    descentSeconds,
    flatSeconds,
    verticalClimb,
    verticalDescent,
    climbLoad,
    descentLoad,
    flatLoad,
    descentShare: totalLoad > 0 ? descentLoad / totalLoad : null,
    descentCount: segments.filter((segment) => segment.kind === "descent").length,
    usedHeartrate,
    segments,
  };
}

export interface RideLoadSummary {
  stravaId: string;
  name: string;
  day: string;
  type: string;
  descentShare: number;
  descentMinutes: number;
  climbMinutes: number;
  verticalDescent: number;
}

export interface LoadSplitAggregate {
  ridesAnalyzed: number;
  medianDescentShare: number | null;
  /** The most descent-dominated rides — shuttle and park days. */
  mostTechnical: RideLoadSummary[];
  byType: { type: string; n: number; medianDescentShare: number }[];
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Rolls per-ride splits into the figures the Insights Lab shows. */
export function aggregateLoadSplits(rides: RideLoadSummary[]): LoadSplitAggregate {
  const byType = new Map<string, number[]>();
  for (const ride of rides) {
    const list = byType.get(ride.type) ?? [];
    list.push(ride.descentShare);
    byType.set(ride.type, list);
  }

  return {
    ridesAnalyzed: rides.length,
    medianDescentShare: medianOf(rides.map((ride) => ride.descentShare)),
    // Ranked on share, but only among rides with enough descending to be
    // meaningful — otherwise a three-minute roll downhill scores 100% and
    // outranks a real shuttle day.
    mostTechnical: [...rides]
      .filter((ride) => ride.descentMinutes >= 10)
      .sort((a, b) => b.descentShare - a.descentShare)
      .slice(0, 5),
    byType: [...byType]
      .map(([type, values]) => ({
        type,
        n: values.length,
        medianDescentShare: medianOf(values) ?? 0,
      }))
      .filter((entry) => entry.n >= 3)
      .sort((a, b) => b.n - a.n),
  };
}

/** Reads the stream shape Strava returns into the arrays this module expects. */
export function streamsFromPayload(
  payload: unknown
): RideStreams & { latlng?: [number, number][] } {
  const raw = payload as Record<string, { data?: unknown[] } | undefined>;
  const series = (key: string): number[] | undefined => {
    const data = raw?.[key]?.data;
    return Array.isArray(data) ? (data as number[]) : undefined;
  };

  const movingData = raw?.moving?.data;
  const latlngData = raw?.latlng?.data;

  return {
    time: series("time"),
    distance: series("distance"),
    altitude: series("altitude"),
    gradeSmooth: series("grade_smooth"),
    velocitySmooth: series("velocity_smooth"),
    heartrate: series("heartrate"),
    moving: Array.isArray(movingData) ? (movingData as boolean[]) : undefined,
    latlng: Array.isArray(latlngData)
      ? (latlngData as [number, number][])
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Descent runs — the unit trail matching works on
// ---------------------------------------------------------------------------

export interface DescentRun {
  /** Trail key: rounded start/end coordinates + a vertical bucket. */
  trailKey: string | null;
  startLatLng: [number, number] | null;
  endLatLng: [number, number] | null;
  seconds: number;
  distanceMetres: number;
  verticalMetres: number;
  medianSpeed: number; // m/s
  /** Coefficient of variation of speed — lower is smoother. */
  speedCv: number | null;
  /** Velocity drops ≥15% within ≤2s, per km — the braking signature. */
  decelPerKm: number | null;
  meanHr: number | null;
  /** The ride's 10th-percentile moving HR — the arousal baseline for F8. */
  rideP10Hr: number | null;
}

function roundCoord(value: number): number {
  // 3 decimal places ≈ 110 m — tight enough to separate trails, loose enough
  // to survive GPS scatter at a trailhead.
  return Math.round(value * 1000) / 1000;
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const rank = p * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return low === high
    ? sorted[low]
    : sorted[low] + (rank - low) * (sorted[high] - sorted[low]);
}

/**
 * Extracts every meaningful descent of a ride as a comparable "run".
 *
 * Only descents of ≥60 s and ≥25 m of drop count — anything smaller is a dip,
 * and scoring it would drown real runs in noise. Runs without GPS get a null
 * trail key: they still contribute to load, but cannot be matched to a trail.
 */
export function computeDescentRuns(
  streams: RideStreams & { latlng?: [number, number][] },
  split: LoadSplit
): DescentRun[] {
  const time = streams.time;
  const velocity = streams.velocitySmooth;
  const distance = streams.distance;
  const heartrate = streams.heartrate;
  const latlng = streams.latlng;
  const moving = streams.moving;

  if (!time) {
    return [];
  }

  // Arousal baseline: the ride's 10th-percentile moving heart rate.
  let rideP10Hr: number | null = null;
  if (heartrate) {
    const movingHr = heartrate.filter(
      (value, index) => value > 40 && (!moving || moving[index] !== false)
    );
    if (movingHr.length >= 60) {
      rideP10Hr = quantile([...movingHr].sort((a, b) => a - b), 0.1);
    }
  }

  const runs: DescentRun[] = [];

  for (const segment of split.segments) {
    if (segment.kind !== "descent") {
      continue;
    }

    const drop = -segment.verticalMetres;
    if (segment.seconds < 60 || drop < 25) {
      continue;
    }

    const from = segment.startIndex;
    const to = segment.endIndex;

    const speeds: number[] = [];
    let decelEvents = 0;

    for (let i = from; i < to; i++) {
      const v = velocity?.[i];
      if (v !== undefined && v > 0.5 && (!moving || moving[i] !== false)) {
        speeds.push(v);
      }

      // Braking event: ≥15% speed loss within ≤2 s.
      const dt = time[i + 1] - time[i];
      const vNext = velocity?.[i + 1];
      if (
        v !== undefined &&
        vNext !== undefined &&
        dt > 0 &&
        dt <= 2 &&
        v > 2 &&
        vNext < v * 0.85
      ) {
        decelEvents++;
      }
    }

    const runDistance =
      distance && distance.length > to ? distance[to] - distance[from] : 0;

    let speedCv: number | null = null;
    let medianSpeed = 0;
    if (speeds.length >= 20) {
      const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const variance =
        speeds.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) /
        speeds.length;
      speedCv = mean > 0 ? Math.sqrt(variance) / mean : null;
      medianSpeed = quantile([...speeds].sort((a, b) => a - b), 0.5);
    }

    const start = latlng?.[from];
    const end = latlng?.[to];
    const hasGps =
      Array.isArray(start) && Array.isArray(end) && start.length === 2;

    // Vertical bucket keeps two different lines off the same ridge apart.
    const trailKey = hasGps
      ? `${roundCoord(start![0])},${roundCoord(start![1])}|` +
        `${roundCoord(end![0])},${roundCoord(end![1])}|` +
        `${Math.round(drop / 25)}`
      : null;

    runs.push({
      trailKey,
      startLatLng: hasGps ? [start![0], start![1]] : null,
      endLatLng: hasGps ? [end![0], end![1]] : null,
      seconds: segment.seconds,
      distanceMetres: Math.max(0, runDistance),
      verticalMetres: drop,
      medianSpeed,
      speedCv,
      decelPerKm:
        runDistance > 200 ? (decelEvents / runDistance) * 1000 : null,
      meanHr: segment.meanHeartrate,
      rideP10Hr,
    });
  }

  return runs;
}
