"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
  upload_id?: number;
  external_id?: string;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id?: string;
  start_latlng?: number[];
  end_latlng?: number[];
  average_temp?: number;
  average_grade_adjusted_speed?: number;
  average_grade?: number;
  positive_elevation_gain?: number;
  negative_elevation_gain?: number;
  calories?: number;
  description?: string;
  photos?: any;
  gear?: any;
  device_name?: string;
  embed_token?: string;
  splits_metric?: any[];
  splits_standard?: any[];
  laps?: any[];
  best_efforts?: any[];
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map?: any;
  has_kudoed: boolean;
  hide_from_home: boolean;
  workout_type?: number;
  suffer_score?: number;
}

interface ActivityMapProps {
  activities: StravaActivity[];
}

export default function FlatActivityMap({ activities }: ActivityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Set Mapbox access token from env
  const mapboxToken = process.env.NEXT_PUBLIC_MAP_BOX_API;
  if (mapboxToken) {
    mapboxgl.accessToken = mapboxToken;
  }

  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [0, 0],
      zoom: 1,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: false,
      attributionControl: false,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      "top-right"
    );

    // Remove 3D building layers once the style has loaded to keep map flat
    map.current.once("styledata", () => {
      const layers = map.current!.getStyle().layers ?? [];
      layers
        .filter((l) => l.type === "fill-extrusion")
        .forEach((l) =>
          map.current!.setLayoutProperty(l.id, "visibility", "none")
        );
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || activities.length === 0) return;

    const validActivities = activities.filter(
      (a) =>
        a.start_latlng &&
        a.start_latlng.length >= 2 &&
        isValidCoordinate(a.start_latlng[0], a.start_latlng[1])
    );

    const bounds = new mapboxgl.LngLatBounds();

    // remove previous markers
    const existing = document.querySelectorAll(".flat-activity-marker");
    existing.forEach((m) => m.remove());

    validActivities.forEach((activity) => {
      const [lat, lng] = activity.start_latlng as [number, number];

      bounds.extend([lng, lat]);

      new mapboxgl.Marker({ color: "#0cf2d0" })
        .setLngLat([lng, lat])
        .addTo(map.current!);
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 40, maxZoom: 10 });
    }
  }, [activities]);

  const isValidCoordinate = (lat: number, lng: number): boolean => {
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
  };

  if (!mapboxToken) {
    return (
      <div className="bg-[#1e2a28] p-6 rounded-lg border border-[#3b5450] text-center text-gray-400">
        Mapbox API token not found.
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-96 rounded-lg overflow-hidden"
      style={{ minHeight: "400px" }}
    />
  );
}
