"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StravaActivity {
  id: number;
  type: string;
  name: string;
  start_latlng?: number[];
  moving_time: number;
  distance: number;
  start_date: string;
}

interface Props {
  activities: StravaActivity[];
}

// Fix default icon path (vite/next may not resolve automatically)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function LeafletDarkFlatMap({ activities }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const isValid = (lat: number, lng: number) =>
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(mapInstance.current);
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;

    // remove existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    activities.forEach((a) => {
      if (!a.start_latlng || a.start_latlng.length < 2) return;
      const [lat, lng] = a.start_latlng as [number, number];
      if (!isValid(lat, lng)) return;

      const marker = L.marker([lat, lng]).addTo(map);
      bounds.extend([lat, lng]);
      marker.bindPopup(
        `<strong>${a.name}</strong><br/>${new Date(
          a.start_date
        ).toLocaleDateString()}`
      );
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [activities]);

  return (
    <div
      ref={mapRef}
      className="w-full h-96 rounded-lg overflow-hidden"
      style={{ minHeight: "400px" }}
    />
  );
}
