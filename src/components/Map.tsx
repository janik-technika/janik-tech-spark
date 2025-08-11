import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

type MapProps = {
  address: string;
};

const Map: React.FC<MapProps> = ({ address }) => {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OLMap | null>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const markerFeatureRef = useRef<Feature<Point> | null>(null);

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
        const osmLayer = new TileLayer({ source: new OSM() });

        const markerSource = new VectorSource();
        markerSourceRef.current = markerSource;
        const markerLayer = new VectorLayer({
          source: markerSource,
        });

        mapRef.current = new OLMap({
          target: mapEl.current,
          layers: [osmLayer, markerLayer],
          view: new View({
            center: fromLonLat([center[0], center[1]]),
            zoom: 15,
          }),
        });
      } else {
        mapRef.current.getView().setCenter(fromLonLat([center[0], center[1]]));
        mapRef.current.getView().setZoom(15);
      }

      // Marker
      if (markerSourceRef.current) {
        if (markerFeatureRef.current) {
          markerFeatureRef.current.setGeometry(
            new Point(fromLonLat([center[0], center[1]]))
          );
        } else {
          const feature = new Feature(
            new Point(fromLonLat([center[0], center[1]]))
          );
          markerSourceRef.current.addFeature(feature);
          markerFeatureRef.current = feature;
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined as unknown as HTMLElement);
        mapRef.current = null;
      }
      markerSourceRef.current = null;
      markerFeatureRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mapEl}
      className="w-full h-72 md:h-96 rounded-xl overflow-hidden"
      role="img"
      aria-label={`Mapa: ${address}`}
    />
  );
};

export default Map;

