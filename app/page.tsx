"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ActivityCard from "@/components/ActivityCard";
import DaySelector from "@/components/DaySelector";
import { itinerary } from "@/app/data/itinerary";
import dynamic from "next/dynamic";

// 👇 mapa solo en cliente (Leaflet lo necesita)
const DayMap = dynamic(() => import("@/components/DayMap"), {
  ssr: false,
});

export default function Home() {
  const [selectedDayId, setSelectedDayId] = useState(itinerary[0]?.id ?? "");

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
    <main className="mx-auto min-h-[100dvh] w-full max-w-[420px] bg-[#FFF7F0] pb-28 text-[#3f2518]">
      
      {/* HEADER */}
      <header className="relative bg-[#FFF7F0] pt-6 pb-10 text-center">
        <h1 className="text-4xl font-bold text-[#3b2416]">Asia Trip</h1>

        <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[#f3d9c9] bg-white px-4 py-1 text-sm text-[#7a4f3d] shadow-sm">
          📅 14 de mayo – 27 de mayo
        </div>

        <div className="relative mt-6 h-[160px] w-full overflow-hidden">
          <Image
            src="/cats-guide.png"
            alt="Gatos"
            fill
            className="object-cover object-bottom"
          />
        </div>
      </header>

      {/* CONTENIDO */}
      <section className="-mt-10 rounded-t-[28px] bg-[#FFF7F0] px-5 pt-5">

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
          <h2 className="text-xl font-semibold">
            Plan del {selectedDay.label}
          </h2>

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

        {/* 🗺️ MAPA EMBEBIDO */}
        <div className="mt-4">
          <DayMap
            places={selectedDay.activities.map((a) => ({
              title: a.title,
              time: a.time,
              icon: a.icon,
             map: a.map,
            }))}
          />
        </div>

        {/* ACTIVIDADES */}
        <div className="mt-5 space-y-4">
          {selectedDay.activities.map((activity) => (
            <ActivityCard
              key={`${selectedDay.id}-${activity.time}-${activity.title}`}
              time={activity.time}
              title={activity.title}
              description={activity.description}
              tag={activity.tag}
              image={activity.image}
              icon={activity.icon}
            />
          ))}
        </div>

      </section>
    </main>
  );
}