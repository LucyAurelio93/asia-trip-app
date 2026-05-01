"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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
};

function createEmojiIcon(activityIcon?: ActivityIcon) {
  const iconData = activityIcon ? activityIconMap[activityIcon] : null;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 9999px;
        background: ${iconData?.color ?? "#475569"};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      ">
        ${iconData?.emoji ?? "📍"}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

export default function DayMap({ places }: DayMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const validPoints = places.filter((p) => p.map);

  const center: [number, number] =
    validPoints.length > 0
      ? [
          validPoints.reduce((sum, p) => sum + (p.map?.lat || 0), 0) /
            validPoints.length,
          validPoints.reduce((sum, p) => sum + (p.map?.lng || 0), 0) /
            validPoints.length,
        ]
      : [37.5665, 126.978];

  useEffect(() => {
    const invalidate = () => {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    };

    invalidate();

    const observer = new ResizeObserver(() => {
      invalidate();
    });

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    window.addEventListener("resize", invalidate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="h-[320px] w-full overflow-hidden rounded-2xl border"
    >
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        whenReady={(event) => {
          mapRef.current = event.target;
          setTimeout(() => {
            event.target.invalidateSize();
          }, 100);
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validPoints.map((p, i) => (
          <Marker
            key={`${p.title}-${i}`}
            position={[p.map!.lat, p.map!.lng]}
            icon={createEmojiIcon(p.icon)}
          >
            <Popup>
              <strong>{p.title}</strong>
              <br />
              {p.time}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}