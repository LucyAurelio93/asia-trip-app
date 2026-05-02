"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import ActivityCard from "@/components/ActivityCard";
import DaySelector from "@/components/DaySelector";
import { itinerary } from "@/app/data/itinerary";
import type { Activity } from "@/app/data/itinerary";
import dynamic from "next/dynamic";
import type { MapHandle } from "@/components/DayMap";
import {
  TripOrderState,
  TripNotesState,
  loadLocalTripState,
  saveLocalOrder,
  saveLocalNotes,
} from "@/lib/tripState";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DayMap = dynamic(() => import("@/components/DayMap"), {
  ssr: false,
});

// ── SortableActivityCard ─────────────────────────────────────────────────────

type SortableProps = {
  activity: Activity;
  notes: string[];
  onEditNote: () => void;
  onClick?: () => void;
};

function SortableActivityCard({ activity, notes, onEditNote, onClick }: SortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.title });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
  };

  const notePreview =
    notes.length === 0
      ? undefined
      : notes.length === 1
        ? notes[0]
        : `${notes.length} notas personales`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActivityCard
        time={activity.time}
        title={activity.title}
        description={activity.description}
        tag={activity.tag}
        image={activity.image}
        icon={activity.icon}
        onClick={onClick}
        note={notePreview}
        onEditNote={onEditNote}
        isDragging={isDragging}
      />
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [selectedDayId, setSelectedDayId] = useState(itinerary[0]?.id ?? "");
  const mapFlyTo = useRef<MapHandle | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [orderByDay, setOrderByDay] = useState<TripOrderState>({});
  const [notes, setNotes] = useState<TripNotesState>({});
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Load persisted state from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const { orderByDay, notes } = loadLocalTripState();
    setOrderByDay(orderByDay);
    setNotes(notes);
  }, []);

  useEffect(() => {
    if (!editingNoteKey) return;

    const timer = window.setTimeout(() => {
      noteTextareaRef.current?.focus();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [editingNoteKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const selectedDay = useMemo(
    () => itinerary.find((day) => day.id === selectedDayId) ?? itinerary[0],
    [selectedDayId]
  );

  const orderedActivities = useMemo(() => {
    if (!selectedDay) return [];
    const savedOrder = orderByDay[selectedDay.id];
    if (!savedOrder) return selectedDay.activities;
    const orderMap = new Map(savedOrder.map((title, i) => [title, i]));
    return [...selectedDay.activities].sort((a, b) => {
      const ai = orderMap.get(a.title) ?? Infinity;
      const bi = orderMap.get(b.title) ?? Infinity;
      return ai - bi;
    });
  }, [selectedDay, orderByDay]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedDay) return;
    const oldIndex = orderedActivities.findIndex((a) => a.title === active.id);
    const newIndex = orderedActivities.findIndex((a) => a.title === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(orderedActivities, oldIndex, newIndex).map((a) => a.title);
    const updated = { ...orderByDay, [selectedDay.id]: newOrder };
    setOrderByDay(updated);
    saveLocalOrder(updated);
  }

  function openNoteEditor(activityTitle: string) {
    if (!selectedDay) return;
    const key = `${selectedDay.id}::${activityTitle}`;
    setEditingNoteKey(key);
    setNoteText("");
  }

  function addNote() {
    if (!editingNoteKey) return;
    const trimmed = noteText.trim();
    if (!trimmed) return;
    const current = notes[editingNoteKey] ?? [];
    const updated = { ...notes, [editingNoteKey]: [...current, trimmed] };
    setNotes(updated);
    saveLocalNotes(updated);
    setNoteText("");
    window.setTimeout(() => {
      noteTextareaRef.current?.focus();
    }, 0);
  }

  function deleteNote(index: number) {
    if (!editingNoteKey) return;
    const current = notes[editingNoteKey] ?? [];
    const updated = { ...notes, [editingNoteKey]: current.filter((_, i) => i !== index) };
    setNotes(updated);
    saveLocalNotes(updated);
  }

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
      {/* NOTE EDITING MODAL */}
      {editingNoteKey && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
          onClick={() => setEditingNoteKey(null)}
        >
          <div
            className="w-full max-w-[400px] rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold text-[#2d2a26]">
              Notas personales
            </h3>
            <textarea
              ref={noteTextareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onPointerDown={() => { noteTextareaRef.current?.focus(); }}
              onTouchStart={() => { noteTextareaRef.current?.focus(); }}
              placeholder="Escribe una nueva nota..."
              className="w-full resize-none rounded-xl border border-[#e0d5cc] bg-[#fdf6f1] p-3 text-sm text-[#2d2a26] outline-none focus:border-[#c26d5a]"
              rows={3}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={addNote}
                className="flex-1 rounded-full bg-[#c26d5a] py-2 text-sm font-semibold text-white"
              >
                Agregar nota
              </button>
              <button
                onClick={() => setEditingNoteKey(null)}
                className="flex-1 rounded-full border border-[#e0d5cc] py-2 text-sm text-[#7a746f]"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4">
              {(notes[editingNoteKey] ?? []).length === 0 ? (
                <p className="text-xs text-[#a09890]">Todavía no hay notas para esta actividad.</p>
              ) : (
                <ul className="space-y-2">
                  {(notes[editingNoteKey] ?? []).map((n, i) => (
                    <li key={`${i}-${n}`} className="flex items-start gap-2 rounded-xl bg-[#fdf6f1] px-3 py-2">
                      <span className="flex-1 text-sm text-[#2d2a26]">{n}</span>
                      <button
                        onClick={() => deleteNote(i)}
                        className="shrink-0 text-xs text-[#c26d5a]"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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
              mapContainerRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              window.setTimeout(() => {
                mapFlyTo.current?.fitToPlaces();
              }, 250);
            }}
            className="rounded-full border border-[#f3c6c6] bg-[#ffecec] px-4 py-1 text-sm text-[#c96b6b]"
          >
            Ver mapa
          </button>
        </div>

        <div ref={mapContainerRef} className="mt-4">
          <DayMap
            places={orderedActivities.map((a) => ({
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedActivities.map((a) => a.title)}
              strategy={verticalListSortingStrategy}
            >
              {orderedActivities.map((activity) => (
                <SortableActivityCard
                  key={`${selectedDay.id}-${activity.title}`}
                  activity={activity}
                  notes={notes[`${selectedDay.id}::${activity.title}`] ?? []}
                  onEditNote={() => openNoteEditor(activity.title)}
                  onClick={
                    activity.map
                      ? () => {
                          mapContainerRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                          mapFlyTo.current?.flyTo(activity.map!.lat, activity.map!.lng);
                        }
                      : undefined
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </section>
    </main>
  );
}
