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
  photos?: unknown;
  gear?: unknown;
  device_name?: string;
  embed_token?: string;
  splits_metric?: unknown[];
  splits_standard?: unknown[];
  laps?: unknown[];
  best_efforts?: unknown[];
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;

  map?: unknown;
  has_kudoed: boolean;
  hide_from_home: boolean;
  workout_type?: number;
  suffer_score?: number;
}

interface ActivityMapProps {
  activities: StravaActivity[];
}

interface ActivityCluster {
  lat: number;
  lng: number;
  activities: StravaActivity[];
  count: number;
}

export default function ActivityMap({ activities }: ActivityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [selectedCluster, setSelectedCluster] =
    useState<ActivityCluster | null>(null);

  // Set Mapbox access token from environment variable
  const mapboxToken = process.env.NEXT_PUBLIC_MAP_BOX_API;
  if (mapboxToken) {
    mapboxgl.accessToken = mapboxToken;
  }

  useEffect(() => {
    if (map.current || !mapContainer.current || !mapboxToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-74.5, 40],
      zoom: 9,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || activities.length === 0) return;

    const processActivities = () => {
      const validActivities = activities.filter((activity) => {
        if (!activity.start_latlng || activity.start_latlng.length < 2) {
          return false;
        }
        const [lat, lng] = activity.start_latlng;
        return isValidCoordinate(lat, lng);
      });

      if (validActivities.length > 0) {
        if (map.current) {
          map.current.resize();
        }
        fitMapToIndividualActivities(validActivities);
        addIndividualMarkersToMap(validActivities);
      }
    };

    if (map.current.isStyleLoaded()) {
      processActivities();
    } else {
      map.current.once("load", processActivities);
    }
  }, [activities]);

  // Helper function to validate coordinates
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

  const fitMapToIndividualActivities = (activities: StravaActivity[]) => {
    if (!map.current || activities.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    activities.forEach((activity) => {
      if (activity.start_latlng && activity.start_latlng.length >= 2) {
        const [lat, lng] = activity.start_latlng;
        if (isValidCoordinate(lat, lng)) {
          bounds.extend([lng, lat]);
        }
      }
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
      });
    }
  };

  const addIndividualMarkersToMap = (activities: StravaActivity[]) => {
    if (!map.current) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".activity-marker");
    existingMarkers.forEach((marker) => marker.remove());

    activities.forEach((activity) => {
      if (!activity.start_latlng || activity.start_latlng.length < 2) return;

      const [lat, lng] = activity.start_latlng;
      if (!isValidCoordinate(lat, lng)) return;

      const marker = new mapboxgl.Marker({ color: "#0cf2d0" })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Attach click handler to show activity info
      marker.getElement().addEventListener("click", () => {
        setSelectedCluster({
          lat,
          lng,
          activities: [activity],
          count: 1,
        });
      });
    });
  };

  const formatActivityInfo = (activity: StravaActivity) => {
    const date = new Date(activity.start_date).toLocaleDateString();
    const duration = Math.round(activity.moving_time / 60);
    const distance = (activity.distance / 1000).toFixed(1);
    const type = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);

    return `${type} - ${distance}km, ${duration}min (${date})`;
  };

  if (!mapboxToken) {
    return (
      <div className="bg-[#1e2a28] p-6 rounded-lg border border-[#3b5450]">
        <div className="text-center text-gray-400">
          Mapbox API token not found. Please add MAP_BOX_API to your .env.local
          file.
        </div>
      </div>
    );
  }

  const validActivities = activities.filter(
    (activity) =>
      activity.start_latlng &&
      activity.start_latlng.length >= 2 &&
      isValidCoordinate(activity.start_latlng[0], activity.start_latlng[1])
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
        <h3 className="text-lg font-bold text-white mb-4">Activity Map</h3>
        <div className="relative">
          <div
            ref={mapContainer}
            className="w-full h-96 rounded-lg overflow-hidden"
            style={{ minHeight: "400px" }}
          />

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {activities.length}
              </p>
              <p className="text-sm text-gray-400">Total Activities</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {validActivities.length}
              </p>
              <p className="text-sm text-gray-400">Activities with Location</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {Math.round(
                  activities.reduce((sum, a) => sum + a.moving_time, 0) / 60
                )}
              </p>
              <p className="text-sm text-gray-400">Total Minutes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0cf2d0]">
                {(
                  activities.reduce((sum, a) => sum + a.distance, 0) / 1000
                ).toFixed(1)}
              </p>
              <p className="text-sm text-gray-400">Total km</p>
            </div>
          </div>

          {validActivities.length < activities.length && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⚠️ {activities.length - validActivities.length} activities were
                excluded due to invalid location data.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedCluster && (
        <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-white">
              Activities at {selectedCluster.lat.toFixed(4)},{" "}
              {selectedCluster.lng.toFixed(4)}
            </h4>
            <button
              onClick={() => setSelectedCluster(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {selectedCluster.activities.map((activity) => (
              <div
                key={activity.id}
                className="text-sm text-gray-300 p-2 bg-[#283937] rounded"
              >
                {formatActivityInfo(activity)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
