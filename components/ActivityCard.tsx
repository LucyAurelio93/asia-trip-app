import Image from "next/image";
import { MapPin } from "lucide-react";

type ActivityCardProps = {
  time: string;
  title: string;
  description: string;
  tag?: string;
  image: string; // 👈 ESTA ES LA CLAVE
};

export default function ActivityCard({
  time,
  title,
  description,
  tag,
  image,
}: ActivityCardProps) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[#f1e5dc] bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
      
      {/* Imagen */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={title}
          fill
           className="object-cover scale-110 group-hover:scale-125 transition-transform duration-500"
        />
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-[#e17878]">
          {time}
        </span>

        <span className="text-base font-semibold text-[#2d2a26]">
          {title}
        </span>

        <span className="text-sm text-[#7a746f]">
          {description}
        </span>
      </div>

      {/* Estado */}
      <div className="flex flex-col items-end gap-2">
        {tag && (
          <span className="rounded-full bg-[#f3e1d8] px-3 py-1 text-xs font-medium text-[#c26d5a]">
            {tag}
          </span>
        )}

        <MapPin size={16} className="text-[#d1a89b]" />
      </div>
    </div>
  );
}