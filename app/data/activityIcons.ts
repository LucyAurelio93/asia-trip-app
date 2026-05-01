import type { ActivityIcon } from "./itinerary";

export const activityIconMap: Record<
  ActivityIcon,
  {
    emoji: string;
    color: string;
    label: string;
  }
> = {
  temple: { emoji: "🏯", color: "#C084FC", label: "Templo" },
  market: { emoji: "🥟", color: "#F59E0B", label: "Mercado" },
  food: { emoji: "🍜", color: "#EF4444", label: "Comida" },
  cafe: { emoji: "☕", color: "#A16207", label: "Café" },
  view: { emoji: "🌄", color: "#3B82F6", label: "Vista" },
  museum: { emoji: "🏛️", color: "#6B7280", label: "Museo" },
  transport: { emoji: "🚆", color: "#10B981", label: "Transporte" },
  street: { emoji: "🏙️", color: "#64748B", label: "Barrio" },
  park: { emoji: "🌿", color: "#22C55E", label: "Parque" },
  hotel: { emoji: "🏨", color: "#94A3B8", label: "Hotel" },
};