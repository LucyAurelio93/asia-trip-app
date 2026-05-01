import Image from "next/image";
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
  image,
  icon,
}: ActivityCardProps) {
  const mapsQuery = title;
  const iconData = icon ? activityIconMap[icon] : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapsQuery
  )}`;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[#f1e5dc] bg-white p-4 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={title}
          fill
          sizes="64px"
          className="scale-110 object-cover transition-transform duration-500 group-hover:scale-125"
        />

        {iconData && (
          <span
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs shadow-sm"
            style={{ backgroundColor: iconData.color }}
            title={iconData.label}
          >
            {iconData.emoji}
          </span>
        )}
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