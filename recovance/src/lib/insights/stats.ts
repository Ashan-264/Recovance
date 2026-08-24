/**
 * P0-5 — Shared statistics for evidence cards.
 *
 * Deliberately minimal and one-sided in what it offers: distributions, effect
 * sizes with n, bootstrap intervals, and stability under resampling. There is
 * no p-value helper and no "try every pair of variables" utility, because the
 * job of this module is to keep a feature honest, not to find it a result.
 */

import { median, percentile } from "./baselines";

export interface Distribution {
  n: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  mean: number;
  /** True when every value is identical — the metric carries no information. */
  constant: boolean;
}

export function describe(values: number[]): Distribution | null {
  const clean = values.filter((value) => isFinite(value));

  if (clean.length === 0) {
    return null;
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);

  return {
    n: clean.length,
    min,
    p25: percentile(clean, 25),
    median: median(clean),
    p75: percentile(clean, 75),
    max,
    mean: clean.reduce((total, value) => total + value, 0) / clean.length,
    constant: min === max,
  };
}

export interface Correlation {
  n: number;
  rho: number; // Spearman rank correlation
  ci95: [number, number]; // bootstrap percentile interval
  /** Interpretation guard: true when the CI straddles zero. */
  inconclusive: boolean;
}

function rank(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array<number>(values.length);
  let i = 0;

  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) {
      j++;
    }
    const averageRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].index] = averageRank;
    }
    i = j + 1;
  }

  return ranks;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let i = 0; i < n; i++) {
    const a = xs[i] - meanX;
    const b = ys[i] - meanY;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }

  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? NaN : num / denom;
}

/** Deterministic PRNG so evidence cards are reproducible. */
function mulberry32(seed: number): () => number {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Spearman correlation with a bootstrap CI.
 *
 * Returns null below n=10 rather than a number: a correlation from eight points
 * is decoration, and reporting one would defeat the point of the gates.
 */
export function correlate(
  pairs: [number, number][],
  iterations = 2000,
  seed = 42
): Correlation | null {
  const clean = pairs.filter(([x, y]) => isFinite(x) && isFinite(y));

  if (clean.length < 10) {
    return null;
  }

  const xs = clean.map(([x]) => x);
  const ys = clean.map(([, y]) => y);
  const rho = pearson(rank(xs), rank(ys));

  const random = mulberry32(seed);
  const samples: number[] = [];

  for (let iteration = 0; iteration < iterations; iteration++) {
    const bx: number[] = [];
    const by: number[] = [];
    for (let i = 0; i < clean.length; i++) {
      const pick = Math.floor(random() * clean.length);
      bx.push(clean[pick][0]);
      by.push(clean[pick][1]);
    }
    const value = pearson(rank(bx), rank(by));
    if (isFinite(value)) {
      samples.push(value);
    }
  }

  const lower = percentile(samples, 2.5);
  const upper = percentile(samples, 97.5);

  return {
    n: clean.length,
    rho,
    ci95: [lower, upper],
    inconclusive: lower <= 0 && upper >= 0,
  };
}

export interface Stability {
  /** Median of the statistic across resamples that drop `dropFraction`. */
  median: number;
  spread: number; // p75 - p25 across resamples
  /** True when dropping a fifth of the data can flip the sign. */
  signFlips: boolean;
}

/**
 * Re-computes a statistic on repeated 80% subsamples.
 *
 * A metric that changes character when a fifth of the days are removed is
 * fitting noise, and the evidence card should say so before any UI is built.
 */
export function stability<T>(
  items: T[],
  statistic: (subset: T[]) => number,
  dropFraction = 0.2,
  iterations = 200,
  seed = 7
): Stability | null {
  if (items.length < 10) {
    return null;
  }

  const random = mulberry32(seed);
  const keep = Math.max(2, Math.round(items.length * (1 - dropFraction)));
  const results: number[] = [];

  for (let iteration = 0; iteration < iterations; iteration++) {
    const pool = [...items];
    // Partial Fisher-Yates: only the prefix we keep needs shuffling.
    for (let i = 0; i < keep; i++) {
      const pick = i + Math.floor(random() * (pool.length - i));
      [pool[i], pool[pick]] = [pool[pick], pool[i]];
    }
    const value = statistic(pool.slice(0, keep));
    if (isFinite(value)) {
      results.push(value);
    }
  }

  if (results.length === 0) {
    return null;
  }

  const positive = results.filter((value) => value > 0).length;
  const negative = results.filter((value) => value < 0).length;

  return {
    median: median(results),
    spread: percentile(results, 75) - percentile(results, 25),
    signFlips: positive > 0 && negative > 0,
  };
}
