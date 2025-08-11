import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type MapProps = {
  address: string;
};

const Map: React.FC<MapProps> = ({ address }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [token, setToken] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("mapboxToken") || "" : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError("");
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json?limit=1&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        const feature = data?.features?.[0];
        // Fallback: přibližné souřadnice Rožnov pod Radhoštěm
        const center: [number, number] = feature?.center || [18.1439, 49.4582];

        if (cancelled) return;

        map.current?.remove();
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/light-v11",
          center,
          zoom: 14,
        });

        map.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: true }),
          "top-right"
        );

        const marker = new mapboxgl.Marker().setLngLat(center).addTo(map.current);
        marker.setPopup(
          new mapboxgl.Popup({ offset: 24 }).setHTML(
            `<strong>JANÍK – zahradní a lesní technika</strong><br/>${address}`
          )
        );
      } catch (e) {
        setError("Nepodařilo se načíst mapu. Zkontrolujte Mapbox token.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      map.current?.remove();
    };
  }, [address, token]);

  const handleSaveToken = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem("token") as HTMLInputElement) || null;
    const value = input?.value.trim();
    if (value) {
      localStorage.setItem("mapboxToken", value);
      setToken(value);
    }
  };

  return (
    <div className="relative w-full h-72 md:h-96 rounded-xl overflow-hidden">
      {!token && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <form onSubmit={handleSaveToken} className="glass rounded-lg p-4 flex flex-col gap-2 w-[min(520px,90%)]">
            <p className="text-sm text-muted-foreground">
              Pro zobrazení mapy vložte prosím Mapbox public token (Dashboard → Tokens).
            </p>
            <input
              name="token"
              type="text"
              placeholder="pk.XXXXXXXX..."
              className="w-full rounded-md bg-background border border-white/10 px-3 py-2 text-sm"
              aria-label="Mapbox public token"
            />
            <button
              type="submit"
              className="self-start inline-flex items-center rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground"
            >
              Uložit token
            </button>
          </form>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
      {loading && (
        <div className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded bg-background/80">
          Načítám mapu…
        </div>
      )}
      {error && (
        <div className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground">
          {error}
        </div>
      )}
    </div>
  );
};

export default Map;
