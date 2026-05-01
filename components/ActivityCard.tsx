import { MapPin } from "lucide-react";
import { activityIconMap } from "@/app/data/activityIcons";
import type { ActivityIcon } from "@/app/data/itinerary";

type ActivityCardProps = {
  time: string;
  title: string;
  description: string;
  tag?: string;
  image: string;
  icon?: ActivityIcon;
};

export default function ActivityCard({
  time,
  title,
  description,
  tag,
  icon,
}: ActivityCardProps) {
  const mapsQuery = title;
  const iconData = icon ? activityIconMap[icon] : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapsQuery
  )}`;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[#f1e5dc] bg-white p-4 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white text-3xl shadow-sm"
        style={{ backgroundColor: iconData?.color ?? "#475569" }}
        title={iconData?.label ?? "Lugar"}
      >
        {iconData?.emoji ?? "📍"}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-[#e17878]">{time}</span>

        <span className="text-base font-semibold text-[#2d2a26]">
          {title}
        </span>

        <span className="text-sm text-[#7a746f]">{description}</span>
      </div>

      <div className="flex flex-col items-end gap-2">
        {tag && (
          <span className="rounded-full bg-[#f3e1d8] px-3 py-1 text-xs font-medium text-[#c26d5a]">
            {tag}
          </span>
        )}

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[#ead7ff] bg-[#f8f0ff] px-3 py-1 text-xs font-semibold text-[#8b5fbf]"
        >
          <MapPin size={13} />
          Ver en mapa
        </a>
      </div>
    </div>
  );
}