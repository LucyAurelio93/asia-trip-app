import { activityIconMap } from "@/app/data/activityIcons";
import type { ActivityIcon } from "@/app/data/itinerary";

type ActivityCardProps = {
  time: string;
  title: string;
  description: string;
  tag?: string;
  image: string;
  icon?: ActivityIcon;
  onClick?: () => void;
  note?: string;
  onEditNote?: () => void;
  isDragging?: boolean;
};

export default function ActivityCard({
  title,
  description,
  tag,
  icon,
  onClick,
  note,
  onEditNote,
  isDragging,
}: ActivityCardProps) {
  const iconData = icon ? activityIconMap[icon] : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`;

  return (
    <div
      className="group flex items-center gap-4 rounded-2xl border border-[#f1e5dc] bg-white p-4 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
      onClick={onClick}
      style={{
        ...(onClick ? { cursor: "pointer" } : {}),
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white text-3xl shadow-sm"
        style={{ backgroundColor: iconData?.color ?? "#475569" }}
        title={iconData?.label ?? "Lugar"}
      >
        {iconData?.emoji ?? "📍"}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <span className="text-base font-semibold text-[#2d2a26]">{title}</span>
        <span className="text-sm text-[#7a746f]">{description}</span>
        {note && (
          <span className="text-xs italic text-[#a0856e]">📝 Nota guardada</span>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {tag && (
          <span className="rounded-full bg-[#f3e1d8] px-3 py-1 text-xs font-medium text-[#c26d5a]">
            {tag}
          </span>
        )}

        <div className="flex items-center gap-1">
          {onEditNote !== undefined && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEditNote();
              }}
              className="inline-flex items-center justify-center rounded-full border border-[#e8ddd4] bg-[#fdf6f1] p-1 hover:bg-[#f3e1d8]"
              title="Agregar nota"
            >
              <img
                src="/cats/lucy-note.png"
                alt="Agregar nota"
                className="h-7 w-7 transition-transform duration-150 hover:scale-110"
              />
            </button>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center rounded-full border border-[#ead7ff] bg-[#f8f0ff] p-1.5"
          >
            <img
              src="/cats/aurelio-map.png"
              alt="Abrir en Google Maps"
              className="h-8 w-8 transition-transform duration-150 hover:scale-110"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
