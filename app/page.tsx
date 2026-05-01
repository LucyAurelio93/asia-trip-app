"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import ActivityCard from "@/components/ActivityCard";
import DaySelector from "@/components/DaySelector";
import { itinerary } from "@/app/data/itinerary";
import dynamic from "next/dynamic";

const DayMap = dynamic(() => import("@/components/DayMap"), {
  ssr: false,
});

export default function Home() {
  const [selectedDayId, setSelectedDayId] = useState(itinerary[0]?.id ?? "");
  const mapFlyTo = useRef<((lat: number, lng: number) => void) | null>(null);

  const selectedDay = useMemo(
    () => itinerary.find((day) => day.id === selectedDayId) ?? itinerary[0],
    [selectedDayId]
  );

  if (!selectedDay) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] items-center justify-center bg-[#FFF7F0] px-5 text-center text-[#3f2518]">
        <p className="text-sm text-[#7a746f]">
          El itinerario todavía no tiene actividades cargadas.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[420px] overflow-hidden bg-[#FFF7F0] pb-28 text-[#3f2518]">
      {/* HEADER */}
      <header className="relative overflow-hidden bg-[#FFF7F0] pt-[env(safe-area-inset-top)]">
        <div className="relative h-[300px] w-full overflow-hidden">
          <Image
            src="/cats-guide.png"
            alt="Asia Trip"
            fill
            priority
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#FFF7F0]" />

          <div className="absolute inset-x-0 top-7 z-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#3b2416] drop-shadow-sm">
              Asia Trip
            </h1>

            <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[#f3d9c9] bg-white/85 px-4 py-1 text-sm text-[#7a4f3d] shadow-sm backdrop-blur">
              📅 14 de mayo – 27 de mayo
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <section className="-mt-6 rounded-t-[28px] bg-[#FFF7F0] px-5 pt-5">
        <DaySelector
          days={itinerary.map(({ id, label, city, date }) => ({
            id,
            label,
            city,
            dateLabel: date,
            icon: "🌸",
          }))}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
        />

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Plan del {selectedDay.label}</h2>

          <button
            onClick={() => {
              const waypoints = selectedDay.activities
                .slice(0, -1)
                .map((a) => encodeURIComponent(a.title))
                .join("|");

              const destination =
                selectedDay.activities[selectedDay.activities.length - 1].title;

              const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                destination
              )}&waypoints=${waypoints}`;

              window.open(url, "_blank");
            }}
            className="rounded-full border border-[#f3c6c6] bg-[#ffecec] px-4 py-1 text-sm text-[#c96b6b]"
          >
            Ver mapa
          </button>
        </div>

        <div className="mt-4">
          <DayMap
            places={selectedDay.activities.map((a) => ({
              title: a.title,
              time: a.time,
              icon: a.icon,
              map: a.map,
            }))}
            flyToRef={mapFlyTo}
          />
        </div>

        <div
          className="mt-5 space-y-4"
          style={{
            backgroundColor: "#fdf6f1",
            backgroundImage: [
              "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(253,246,241,1))",
              "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 1px, transparent 1px)",
              "radial-gradient(circle at 80% 80%, rgba(0,0,0,0.02) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "auto, 40px 40px, 40px 40px",
            borderRadius: "16px",
            padding: "12px 8px",
          }}
        >
          {selectedDay.activities.map((activity) => (
            <ActivityCard
              key={`${selectedDay.id}-${activity.time}-${activity.title}`}
              time={activity.time}
              title={activity.title}
              description={activity.description}
              tag={activity.tag}
              image={activity.image}
              icon={activity.icon}
              onClick={
                activity.map
                  ? () => mapFlyTo.current?.(activity.map!.lat, activity.map!.lng)
                  : undefined
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}