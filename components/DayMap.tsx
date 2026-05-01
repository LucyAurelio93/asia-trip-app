"use client";

import { useEffect, useRef, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { activityIconMap } from "@/app/data/activityIcons";
import type { ActivityIcon } from "@/app/data/itinerary";

type Activity = {
  title: string;
  time: string;
  icon?: ActivityIcon;
  map?: {
    lat: number;
    lng: number;
  };
};

type DayMapProps = {
  places: Activity[];
  flyToRef?: { current: ((lat: number, lng: number) => void) | null };
};

const CITY_ZOOM = 14;

let _stylesInjected = false;
function injectHotelStyles() {
  if (_stylesInjected || typeof document === "undefined") return;
  _stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes hotel-beacon {
      0%   { transform: scale(1);   opacity: 0.75; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .hotel-pulse-ring {
      animation: hotel-beacon 2.2s ease-out infinite;
    }
    .hotel-return-btn:hover {
      background: rgba(255,255,255,0.98) !important;
      box-shadow: 0 3px 12px rgba(0,0,0,0.2) !important;
    }
    .hotel-return-btn:active {
      transform: scale(0.96);
    }
  `;
  document.head.appendChild(style);
}

function createEmojiIcon(activityIcon?: ActivityIcon, isHotel = false) {
  const iconData = activityIcon ? activityIconMap[activityIcon] : null;
  const size = isHotel ? 44 : 34;
  const fontSize = isHotel ? 22 : 18;
  const border = isHotel ? "3px solid white" : "2px solid white";
  const color = iconData?.color ?? "#475569";
  const shadow = isHotel
    ? `0 4px 16px rgba(0,0,0,0.4), 0 0 0 2px white, 0 0 10px 3px ${color}66`
    : "0 4px 10px rgba(0,0,0,0.25)";

  const ringHtml = isHotel
    ? `<div
        class="hotel-pulse-ring"
        style="
          position: absolute;
          inset: -9px;
          border-radius: 9999px;
          border: 2.5px solid ${color};
          pointer-events: none;
        "
      ></div>`
    : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        ${ringHtml}
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          border: ${border};
          box-shadow: ${shadow};
        ">
          ${iconData?.emoji ?? "📍"}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// Skips the first mount — MapContainer already initializes at center.
// On day changes: if multiple points, fitBounds to show all then drift to hotel; else flyTo hotel.
function RecenterMap({ lat, lng, allPoints }: { lat: number; lng: number; allPoints: Activity[] }) {
  const map = useMap();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints.map((p) => [p.map!.lat, p.map!.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: false });
      const currentZoom = map.getZoom();
      map.flyTo([lat, lng], currentZoom, { animate: true, duration: 0.6 });
    } else {
      map.flyTo([lat, lng], CITY_ZOOM, { animate: true, duration: 0.8 });
    }
  }, [lat, lng, allPoints, map]);

  return null;
}

export default function DayMap({ places, flyToRef }: DayMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const validPoints = useMemo(() => places.filter((p) => p.map), [places]);

  const anchor = useMemo(
    () => validPoints.find((p) => p.icon === "hotel") ?? validPoints[0],
    [validPoints]
  );

  // Captured once on mount — MapContainer ignores center prop changes after init.
  const initialCenter = useRef<[number, number]>(
    anchor ? [anchor.map!.lat, anchor.map!.lng] : [37.5665, 126.978]
  );

  // Memoize icon objects to avoid recreating L.divIcon on every render.
  const markerData = useMemo(
    () =>
      validPoints.map((p) => ({
        ...p,
        isHotel: p.icon === "hotel",
        iconObj: createEmojiIcon(p.icon, p.icon === "hotel"),
      })),
    [validPoints]
  );

  // Route: hotel first, then remaining points in array order.
  const routeCoords = useMemo((): [number, number][] => {
    if (!anchor || validPoints.length < 2) return [];
    const hotelCoord: [number, number] = [anchor.map!.lat, anchor.map!.lng];
    const rest = validPoints
      .filter((p) => p !== anchor)
      .map((p): [number, number] => [p.map!.lat, p.map!.lng]);
    return [hotelCoord, ...rest];
  }, [anchor, validPoints]);

  useEffect(() => {
    injectHotelStyles();
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const invalidate = () => {
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
    };

    const observer = new ResizeObserver(invalidate);
    observer.observe(el);
    window.addEventListener("resize", invalidate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  useEffect(() => {
    if (!flyToRef) return;
    flyToRef.current = (lat: number, lng: number) => {
      if (!mapRef.current) return;
      mapRef.current.stop();
      mapRef.current.flyTo([lat, lng], CITY_ZOOM, { animate: true, duration: 0.8 });
    };
    return () => { if (flyToRef) flyToRef.current = null; };
  }, [flyToRef]);

  const handleReturnToHotel = () => {
    if (!anchor || !mapRef.current) return;
    mapRef.current.stop();
    mapRef.current.flyTo(
      [anchor.map!.lat, anchor.map!.lng],
      CITY_ZOOM,
      { animate: true, duration: 0.8 }
    );
  };

  return (
    <div
      ref={wrapperRef}
      className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-[#f3d9c9]"
    >
      <MapContainer
        ref={mapRef}
        center={initialCenter.current}
        zoom={CITY_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={false}
        whenReady={() => {
          setTimeout(() => mapRef.current?.invalidateSize(), 100);
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          keepBuffer={4}
        />

        {anchor && <RecenterMap lat={anchor.map!.lat} lng={anchor.map!.lng} allPoints={validPoints} />}

        {routeCoords.length >= 2 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: "#c4bcb8",
              weight: 1.5,
              opacity: 0.4,
              dashArray: "3, 9",
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {markerData.map((p, i) => (
          <Marker
            key={`${p.title}-${i}`}
            position={[p.map!.lat, p.map!.lng]}
            icon={p.iconObj}
            zIndexOffset={p.isHotel ? 1000 : 0}
          >
            <Popup>
              <strong>{p.title}</strong>
              <br />
              {p.time}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {anchor && (
        <button
          className="hotel-return-btn"
          onClick={handleReturnToHotel}
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            zIndex: 1000,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #f3d9c9",
            borderRadius: "999px",
            padding: "5px 12px",
            fontSize: "13px",
            color: "#7a4f3d",
            boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            lineHeight: "1.4",
            transition: "box-shadow 0.15s ease, background 0.15s ease, transform 0.1s ease",
          }}
        >
          🏨 Hotel
        </button>
      )}
    </div>
  );
}
