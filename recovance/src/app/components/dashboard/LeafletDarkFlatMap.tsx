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

// Fix for default Leaflet markers
interface LeafletIconDefault extends L.Icon.Default {
  _getIconUrl?: () => string;
}

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
    if (typeof window === "undefined" || !mapRef.current || mapInstance.current)
      return;

    // Fix default Leaflet icon paths
    delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
      // Handles double-click on desktop; touch is handled manually below.
      doubleClickZoom: true,
    });
    mapInstance.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map);

    // Leaflet drives double-click zoom off the browser's synthesized
    // `dblclick`, which most mobile browsers never emit because the map
    // container sets `touch-action: none`. Detect the double tap ourselves
    // and zoom about the tapped point, matching the desktop behaviour.
    const container = map.getContainer();
    const DOUBLE_TAP_MS = 300;
    const DOUBLE_TAP_SLOP_PX = 30;
    let lastTapTime = 0;
    let lastTapPoint: L.Point | null = null;

    const handleTouchEnd = (e: TouchEvent) => {
      // Ignore pinch zooms and any gesture still holding fingers down.
      if (e.touches.length > 0 || e.changedTouches.length !== 1) {
        lastTapTime = 0;
        lastTapPoint = null;
        return;
      }

      // Let marker/popup taps behave normally instead of zooming.
      const target = e.target as HTMLElement | null;
      if (target?.closest(".leaflet-marker-icon, .leaflet-popup")) {
        lastTapTime = 0;
        lastTapPoint = null;
        return;
      }

      const touch = e.changedTouches[0];
      const rect = container.getBoundingClientRect();
      const point = L.point(
        touch.clientX - rect.left,
        touch.clientY - rect.top
      );
      const now = Date.now();

      const isDoubleTap =
        lastTapPoint !== null &&
        now - lastTapTime <= DOUBLE_TAP_MS &&
        point.distanceTo(lastTapPoint) <= DOUBLE_TAP_SLOP_PX;

      if (isDoubleTap) {
        lastTapTime = 0;
        lastTapPoint = null;
        // Stops the browser emitting the compatibility dblclick that would
        // make Leaflet's own handler zoom a second level on top of ours.
        e.preventDefault();
        map.setZoomAround(
          map.containerPointToLatLng(point),
          map.getZoom() + 1
        );
        return;
      }

      lastTapTime = now;
      lastTapPoint = point;
    };

    // Not passive: the double tap calls preventDefault().
    container.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchend", handleTouchEnd);
    };
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
