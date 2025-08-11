"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface LeafletActivityMapProps {
  activities: StravaActivity[];
  stravaToken: string;
}

// Fix for default Leaflet markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LeafletActivityMap: React.FC<LeafletActivityMapProps> = ({
  activities,
  stravaToken,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to validate coordinates
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    return (
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      lat !== 0 &&
      lng !== 0
    );
  };

  // Helper function to create custom marker icon
  const createCustomMarkerIcon = (activityCount: number) => {
    const size = Math.max(20, Math.min(30, 20 + activityCount * 2));
    const color = "#10b981"; // teal color

    return L.divIcon({
      className: "custom-activity-marker",
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${Math.max(10, Math.min(14, 10 + activityCount))}px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ${activityCount}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Helper function to process activities and add markers
  const processActivities = () => {
    if (!mapInstanceRef.current || activities.length === 0) return;

    const map = mapInstanceRef.current;
    // Initialize bounds with an empty array to satisfy TypeScript overload
    const bounds = L.latLngBounds([]);
    const activityClusters: { [key: string]: StravaActivity[] } = {};
    let validActivitiesCount = 0;

    console.log("Processing activities for Leaflet map...");

    // Group activities by location (rounded to 3 decimal places for clustering)
    activities.forEach((activity) => {
      if (!activity.start_latlng || activity.start_latlng.length !== 2) {
        console.log(`Skipping activity ${activity.id} - no coordinates`);
        return;
      }

      // Strava returns coordinates in [lng, lat] order. Swap them to [lat, lng] for Leaflet.
      const [lng, lat] = activity.start_latlng as [number, number];

      console.debug(`Activity ${activity.id} raw coords: [${lng}, ${lat}]`);

      if (!isValidCoordinate(lat, lng)) {
        console.log(
          `Skipping activity ${activity.id} - invalid coordinates: lat=${lat}, lng=${lng}`
        );
        return;
      }

      validActivitiesCount++;
      const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;

      if (!activityClusters[key]) {
        activityClusters[key] = [];
      }
      activityClusters[key].push(activity);

      // Extend bounds
      bounds.extend([lat, lng]);
    });

    console.log(`Valid activities found: ${validActivitiesCount}`);
    console.log(`Activity clusters: ${Object.keys(activityClusters).length}`);

    // Add markers for each cluster
    Object.entries(activityClusters).forEach(([coords, clusterActivities]) => {
      const [lat, lng] = coords.split(",").map(Number);
      const activityCount = clusterActivities.length;

      const marker = L.marker([lat, lng], {
        icon: createCustomMarkerIcon(activityCount),
      }).addTo(map);

      // Create popup content
      const popupContent = `
        <div style="max-width: 300px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Activities at this location</h4>
          <p style="margin: 0 0 8px 0; color: #666;">${activityCount} activity${
        activityCount > 1 ? "ies" : "y"
      }</p>
          <div style="max-height: 200px; overflow-y: auto;">
            ${clusterActivities
              .slice(0, 5)
              .map(
                (activity) => `
              <div style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                <strong>${activity.name}</strong><br>
                <small>${activity.type} • ${new Date(
                  activity.start_date
                ).toLocaleDateString()}</small>
              </div>
            `
              )
              .join("")}
            ${
              clusterActivities.length > 5
                ? `<p style="margin: 0; color: #666;">... and ${
                    clusterActivities.length - 5
                  } more</p>`
                : ""
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    // Fit map to bounds if we have valid activities
    if (validActivitiesCount > 0) {
      map.fitBounds(bounds, { padding: [20, 20] });
      console.log("Map bounds set successfully");
    } else {
      console.log("No valid activities to display");
      setError("No activities with valid locations found");
    }
  };

  useEffect(() => {
    if (!mapRef.current || !stravaToken) return;

    console.log("Initializing Leaflet map...");

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Process activities after map is ready
    map.whenReady(() => {
      console.log("Leaflet map is ready");
      processActivities();
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stravaToken]);

  // Reprocess activities when activities change
  useEffect(() => {
    if (mapInstanceRef.current && activities.length > 0) {
      // Clear existing markers
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          mapInstanceRef.current?.removeLayer(layer);
        }
      });

      // Add tile layer back (it gets removed when clearing)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      processActivities();
    }
  }, [activities]);

  if (!stravaToken) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">
          Please enter your Strava API token to view activities
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
};

export default LeafletActivityMap;
