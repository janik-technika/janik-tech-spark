import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths in bundlers (Vite)
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

type MapProps = {
  address: string;
};

const Map: React.FC<MapProps> = ({ address }) => {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Geocode přes Nominatim (OpenStreetMap)
      let center: [number, number] = [18.1439, 49.4582]; // fallback: Rožnov pod Radhoštěm
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            // User-Agent nelze v prohlížeči nastavit; Referer poslouží pro identifikaci
            "Accept-Language": "cs",
          },
        });
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.lon && data[0]?.lat) {
          center = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        }
      } catch (e) {
        // ponecháme fallback
      }

      if (cancelled || !mapEl.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, {
          center: [center[1], center[0]],
          zoom: 15,
          zoomControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> přispěvatelé',
          maxZoom: 19,
        }).addTo(mapRef.current);

        L.control.zoom({ position: "topright" }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([center[1], center[0]], 15);
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([center[1], center[0]]);
      } else if (mapRef.current) {
        markerRef.current = L.marker([center[1], center[0]]).addTo(mapRef.current);
      }

      markerRef.current?.bindPopup(
        `<strong>JANÍK – zahradní a lesní technika</strong><br/>${address}`
      );
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return <div ref={mapEl} className="w-full h-72 md:h-96 rounded-xl overflow-hidden" />;
};

export default Map;
