"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { decodePolyline } from "@/lib/polyline";
import {
  allSportStyles,
  formatCompact,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHours,
  sportColor,
  sportKey,
  sportLabel,
} from "@/lib/activityStyle";

interface StravaActivity {
  id: number;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_latlng?: number[];
  end_latlng?: number[];
  suffer_score?: number;
  map?: { summary_polyline?: string } | null;
}

interface ActivityMapProps {
  activities: StravaActivity[];
}

type ViewMode = "routes" | "points" | "both";

const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const VIEW_STORAGE_KEY = "recovance_map_view_v1";

interface SavedView {
  center: [number, number];
  zoom: number;
}

/** The camera the user last left the map at, if any. */
function readSavedView(): SavedView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedView;
    if (
      Array.isArray(parsed.center) &&
      parsed.center.length === 2 &&
      parsed.center.every((value) => typeof value === "number" && isFinite(value)) &&
      typeof parsed.zoom === "number" &&
      parsed.zoom >= 0 &&
      parsed.zoom <= 22
    ) {
      return parsed;
    }
  } catch {
    // Corrupt state is discarded; the map just auto-fits instead.
  }
  return null;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

function summaryPolyline(activity: StravaActivity): string | null {
  const line = activity.map?.summary_polyline;
  return line && line.length > 0 ? line : null;
}

// Popup markup for a single activity. Kept inline so it can be handed
// straight to Mapbox, which expects an HTML string.
function popupHtml(activity: StravaActivity): string {
  const color = sportColor(activity.type);
  const date = new Date(activity.start_date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const stat = (label: string, value: string) => `
    <div style="min-width:64px">
      <div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#7f9d98">${label}</div>
      <div style="font-size:13px;font-weight:600;color:#eaf6f4">${value}</div>
    </div>`;

  const heartRate = activity.average_heartrate
    ? stat("Avg HR", `${Math.round(activity.average_heartrate)} bpm`)
    : "";

  return `
    <div style="font-family:inherit;min-width:230px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}"></span>
        <span style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${color}">${
          activity.type || "Activity"
        }</span>
      </div>
      <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:2px">${
        activity.name || "Untitled"
      }</div>
      <div style="font-size:11px;color:#7f9d98;margin-bottom:10px">${date}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px 14px">
        ${stat("Distance", formatDistance(activity.distance))}
        ${stat("Moving", formatDuration(activity.moving_time))}
        ${stat("Elev gain", formatElevation(activity.total_elevation_gain))}
        ${heartRate}
      </div>
      <a href="https://www.strava.com/activities/${activity.id}"
         target="_blank" rel="noopener noreferrer"
         style="display:inline-block;margin-top:10px;font-size:11px;font-weight:700;color:#0cf2d0;text-decoration:none">
        View on Strava →
      </a>
    </div>`;
}

export default function ActivityMap({ activities }: ActivityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  // Restoring a saved camera suppresses auto-fit; "Fit all" brings it back.
  const savedViewRef = useRef<SavedView | null>(null);
  const lastBoundsRef = useRef<mapboxgl.LngLatBounds | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [hiddenSports, setHiddenSports] = useState<Set<string>>(new Set());

  const mapboxToken = process.env.NEXT_PUBLIC_MAP_BOX_API;

  const visibleActivities = useMemo(
    () => activities.filter((a) => !hiddenSports.has(sportKey(a.type))),
    [activities, hiddenSports]
  );

  // Which sports are actually present, with counts, for the legend.
  const sportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      const key = sportKey(activity.type);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [activities]);

  const routeFeatures = useMemo(() => {
    return visibleActivities.flatMap((activity) => {
      const encoded = summaryPolyline(activity);
      if (!encoded) {
        return [];
      }

      const coordinates = decodePolyline(encoded);
      if (coordinates.length < 2) {
        return [];
      }

      return [
        {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates },
          properties: {
            id: activity.id,
            color: sportColor(activity.type),
            sport: sportKey(activity.type),
          },
        },
      ];
    });
  }, [visibleActivities]);

  const pointFeatures = useMemo(() => {
    return visibleActivities.flatMap((activity) => {
      if (!activity.start_latlng || activity.start_latlng.length < 2) {
        return [];
      }

      const [lat, lng] = activity.start_latlng;
      if (!isValidCoordinate(lat, lng)) {
        return [];
      }

      return [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [lng, lat] },
          properties: {
            id: activity.id,
            color: sportColor(activity.type),
            sport: sportKey(activity.type),
            // Scales the dot a little with ride length.
            weight: Math.min(1, (activity.distance || 0) / 40000),
          },
        },
      ];
    });
  }, [visibleActivities]);

  const activityById = useMemo(() => {
    const lookup = new Map<number, StravaActivity>();
    activities.forEach((activity) => lookup.set(activity.id, activity));
    return lookup;
  }, [activities]);

  // Create the map once.
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    const savedView = readSavedView();
    savedViewRef.current = savedView;

    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: savedView?.center ?? [-84.39, 33.75],
      zoom: savedView?.zoom ?? 8,
      attributionControl: false,
    });

    // Remember where the user leaves the camera, so the next visit opens
    // exactly there instead of re-fitting and forcing another zoom-in.
    instance.on("moveend", () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const center = instance.getCenter();
        const view: SavedView = {
          center: [center.lng, center.lat],
          zoom: instance.getZoom(),
        };

        // Also mark the camera as user-owned for the rest of this session, so
        // a later data refresh cannot auto-fit the view out from under them.
        savedViewRef.current = view;

        try {
          localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
        } catch {
          // Storage full/blocked — persistence is best-effort.
        }
      }, 400);
    });

    instance.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
    instance.addControl(new mapboxgl.FullscreenControl(), "top-right");
    instance.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");

    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "280px",
      className: "recovance-popup",
    });

    instance.on("load", () => {
      instance.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      instance.addSource("points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Wide, blurred copy underneath gives the lines their glow.
      instance.addLayer({
        id: "routes-glow",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 7,
          "line-opacity": 0.18,
          "line-blur": 4,
        },
      });

      instance.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 12, 2.6, 16, 4],
          "line-opacity": 0.9,
        },
      });

      instance.addLayer({
        id: "points-halo",
        type: "circle",
        source: "points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            ["+", 7, ["*", 5, ["get", "weight"]]],
            14,
            ["+", 14, ["*", 10, ["get", "weight"]]],
          ],
          "circle-opacity": 0.16,
          "circle-blur": 0.9,
        },
      });

      instance.addLayer({
        id: "points-core",
        type: "circle",
        source: "points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            ["+", 3, ["*", 2, ["get", "weight"]]],
            14,
            ["+", 5.5, ["*", 3.5, ["get", "weight"]]],
          ],
          "circle-stroke-color": "#0b1211",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.95,
        },
      });

      setStyleReady(true);
    });

    map.current = instance;

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      popup.current?.remove();
      instance.remove();
      map.current = null;
      setStyleReady(false);
    };
  }, [mapboxToken]);

  const showActivityPopup = useCallback(
    (id: number, lngLat: mapboxgl.LngLatLike) => {
      const activity = activityById.get(id);
      if (!activity || !map.current || !popup.current) {
        return;
      }

      popup.current
        .setLngLat(lngLat)
        .setHTML(popupHtml(activity))
        .addTo(map.current);
    },
    [activityById]
  );

  // Interaction: pointer feedback plus click-to-inspect on dots and routes.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !styleReady) {
      return;
    }

    const interactiveLayers = ["points-core", "routes-line"];

    const onEnter = () => {
      instance.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      instance.getCanvas().style.cursor = "";
    };
    const onClick = (
      event: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }
    ) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "number" || typeof id === "string") {
        showActivityPopup(Number(id), event.lngLat);
        // Ease in toward the click — never zoom OUT from where the user is.
        instance.easeTo({
          center: event.lngLat,
          zoom: Math.max(instance.getZoom(), 13.5),
          duration: 650,
        });
      }
    };

    interactiveLayers.forEach((layer) => {
      instance.on("mouseenter", layer, onEnter);
      instance.on("mouseleave", layer, onLeave);
      instance.on("click", layer, onClick);
    });

    return () => {
      interactiveLayers.forEach((layer) => {
        instance.off("mouseenter", layer, onEnter);
        instance.off("mouseleave", layer, onLeave);
        instance.off("click", layer, onClick);
      });
    };
  }, [styleReady, showActivityPopup]);

  // Push data into the sources and frame it.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !styleReady) {
      return;
    }

    (instance.getSource("routes") as mapboxgl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: routeFeatures,
    });
    (instance.getSource("points") as mapboxgl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: pointFeatures,
    });

    const bounds = new mapboxgl.LngLatBounds();
    routeFeatures.forEach((feature) =>
      feature.geometry.coordinates.forEach((coord) => bounds.extend(coord))
    );
    pointFeatures.forEach((feature) =>
      bounds.extend(feature.geometry.coordinates as [number, number])
    );

    lastBoundsRef.current = bounds.isEmpty() ? null : bounds;

    if (!bounds.isEmpty() && !savedViewRef.current) {
      instance.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 700 });
    }
  }, [routeFeatures, pointFeatures, styleReady]);

  // Apply the routes/points/both toggle.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !styleReady) {
      return;
    }

    const show = (layer: string, visible: boolean) =>
      instance.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");

    show("routes-glow", viewMode !== "points");
    show("routes-line", viewMode !== "points");
    show("points-halo", viewMode !== "routes");
    show("points-core", viewMode !== "routes");
  }, [viewMode, styleReady]);

  const toggleSport = (key: string) => {
    setHiddenSports((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!mapboxToken) {
    return (
      <div className="rounded-xl border border-[#3b5450] bg-[#151f1e] p-6 text-center text-sm text-gray-400">
        Mapbox token not found. Add NEXT_PUBLIC_MAP_BOX_API to your .env.local file.
      </div>
    );
  }

  const withRoutes = routeFeatures.length;
  const withPoints = pointFeatures.length;
  const totalDistance = visibleActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
  const totalElevation = visibleActivities.reduce(
    (sum, a) => sum + (a.total_elevation_gain || 0),
    0
  );
  const totalMovingTime = visibleActivities.reduce(
    (sum, a) => sum + (a.moving_time || 0),
    0
  );

  const stats = [
    { label: "Activities", value: formatCompact(visibleActivities.length), unit: "" },
    { label: "Distance", value: formatCompact(totalDistance / 1000), unit: "km" },
    { label: "Elevation", value: formatCompact(totalElevation), unit: "m" },
    { label: "Moving time", value: formatHours(totalMovingTime), unit: "h" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#3b5450] bg-[#151f1e]">
      {/* Popup theming — Mapbox renders popups outside the React tree. */}
      <style>{`
        .recovance-popup .mapboxgl-popup-content {
          background: rgba(17, 27, 26, .97);
          border: 1px solid #3b5450;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 12px 32px rgba(0,0,0,.55);
        }
        .recovance-popup .mapboxgl-popup-tip { border-top-color: rgba(17,27,26,.97); border-bottom-color: rgba(17,27,26,.97); }
        .recovance-popup .mapboxgl-popup-close-button { color: #7f9d98; font-size: 16px; padding-right: 6px; }
        .recovance-popup .mapboxgl-popup-close-button:hover { background: transparent; color: #fff; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
        <div>
          <h3 className="text-white text-base font-bold">Activity Map</h3>
          <p className="text-xs text-[#7f9d98]">
            {withRoutes} with GPS route{withRoutes === 1 ? "" : "s"} · {withPoints}{" "}
            mapped start{withPoints === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (map.current && lastBoundsRef.current) {
              map.current.fitBounds(lastBoundsRef.current, {
                padding: 60,
                maxZoom: 13,
                duration: 700,
              });
            }
          }}
          className="rounded-lg border border-[#3b5450] px-3 py-1 text-xs font-bold text-[#9cbab5] transition hover:border-[#0cf2d0] hover:text-white"
          title="Zoom back out to show every activity"
        >
          Fit all
        </button>
        <div className="flex gap-1 rounded-lg bg-[#0f1817] p-1">
          {(["both", "routes", "points"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                viewMode === mode
                  ? "bg-[#0cf2d0] text-[#111817]"
                  : "text-[#9cbab5] hover:text-[#f4f7f7]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Stat tiles: muted label above, value in primary ink with a small
          unit, so the numbers carry the emphasis rather than the labels. */}
      <div className="grid grid-cols-2 gap-px border-b border-[#3b5450] bg-[#3b5450] sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#151f1e] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7f9d98]">
              {stat.label}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[26px] font-semibold leading-none text-white">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-xs font-medium text-[#9cbab5]">
                  {stat.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div ref={mapContainer} className="h-[460px] w-full" />

      {/* Legend doubles as a per-sport filter. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[#283937] px-4 py-3">
        {allSportStyles()
          .filter((style) => sportCounts.has(style.key))
          .map((style) => {
            const hidden = hiddenSports.has(style.key);
            return (
              <button
                key={style.key}
                onClick={() => toggleSport(style.key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  hidden
                    ? "border-[#283937] text-[#4d625f]"
                    : "border-[#3b5450] text-[#d6e6e3] hover:border-[#0cf2d0]"
                }`}
                title={hidden ? `Show ${sportLabel(style.key)}` : `Hide ${sportLabel(style.key)}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: hidden ? "#3b5450" : style.color,
                    boxShadow: hidden ? "none" : `0 0 6px ${style.color}`,
                  }}
                />
                {style.label}
                <span className="text-[#7f9d98]">{sportCounts.get(style.key)}</span>
              </button>
            );
          })}

        {activities.length > 0 && withRoutes === 0 && (
          <span className="ml-auto text-xs text-[#7f9d98]">
            No route lines — these activities have no GPS polyline.
          </span>
        )}
      </div>
    </div>
  );
}
