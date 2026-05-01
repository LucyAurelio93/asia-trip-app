"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

type Activity = {
  title: string;
  time: string;
  map?: {
    lat: number;
    lng: number;
  };
};

type DayMapProps = {
  places: Activity[];
};

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function DayMap({ places }: DayMapProps) {
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

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {places.map((p, i) => (
          <Marker
            key={i}
            position={
              p.map ? [p.map.lat, p.map.lng] : [37.5665, 126.978]
            }
            icon={icon}
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