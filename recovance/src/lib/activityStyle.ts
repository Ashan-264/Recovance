// Shared visual language for activities on maps and legends.

export interface SportStyle {
  key: string;
  label: string;
  color: string;
}

const SPORT_STYLES: SportStyle[] = [
  { key: "ride", label: "Ride", color: "#0cf2d0" },
  { key: "mtb", label: "Mountain Bike", color: "#f97316" },
  { key: "run", label: "Run", color: "#f43f5e" },
  { key: "hike", label: "Hike / Walk", color: "#34d399" },
  { key: "strength", label: "Strength", color: "#a78bfa" },
  { key: "water", label: "Water", color: "#38bdf8" },
  { key: "other", label: "Other", color: "#94a3b8" },
];

const STYLE_BY_KEY = new Map(SPORT_STYLES.map((style) => [style.key, style]));

// Maps Strava's activity `type` onto one of the buckets above.
export function sportKey(type: string | undefined): string {
  const value = (type || "").toLowerCase();

  if (value.includes("mountainbike") || value.includes("gravel")) {
    return "mtb";
  }
  if (value.includes("ride") || value.includes("cycl") || value.includes("bike")) {
    return "ride";
  }
  if (value.includes("run")) {
    return "run";
  }
  if (value.includes("hike") || value.includes("walk")) {
    return "hike";
  }
  if (
    value.includes("weight") ||
    value.includes("workout") ||
    value.includes("crossfit") ||
    value.includes("strength")
  ) {
    return "strength";
  }
  if (
    value.includes("swim") ||
    value.includes("row") ||
    value.includes("kayak") ||
    value.includes("paddl") ||
    value.includes("surf")
  ) {
    return "water";
  }

  return "other";
}

export function sportColor(type: string | undefined): string {
  return STYLE_BY_KEY.get(sportKey(type))?.color ?? "#94a3b8";
}

export function sportLabel(key: string): string {
  return STYLE_BY_KEY.get(key)?.label ?? "Other";
}

export function allSportStyles(): SportStyle[] {
  return SPORT_STYLES;
}

export function formatDistance(meters: number | undefined): string {
  if (!meters) {
    return "—";
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) {
    return "—";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatElevation(meters: number | undefined): string {
  return meters ? `${Math.round(meters)} m` : "—";
}

/** Compacts large values for stat tiles: 1,284 · 12.9K · 1.2M */
export function formatCompact(value: number): string {
  if (!isFinite(value) || value === 0) {
    return "0";
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 10_000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return Math.round(value).toLocaleString();
}

/** Total hours, for a moving-time stat tile. */
export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours >= 10 ? Math.round(hours).toLocaleString() : hours.toFixed(1);
}
