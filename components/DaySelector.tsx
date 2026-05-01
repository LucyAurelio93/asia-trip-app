"use client";

type Day = {
  id: string;
  label: string;
  city: string;
  dateLabel: string;
  icon: string;
};

type DaySelectorProps = {
  days: Day[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
};

export default function DaySelector({
  days,
  selectedDayId,
  onSelectDay,
}: DaySelectorProps) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((day) => {
        const isActive = day.id === selectedDayId;

        return (
          <button
            key={day.id}
            type="button"
            onClick={() => onSelectDay(day.id)}
            className={`relative min-w-[118px] shrink-0 rounded-3xl border bg-[#fffaf5] px-4 py-3 text-left shadow-sm transition ${
              isActive
                ? "border-[#f8a9b8] ring-2 ring-[#f7dce3]"
                : "border-[#f2e5d8] hover:border-[#f4c3cf]"
            }`}
          >
            <p className="text-xl leading-none">{day.icon}</p>

            <p className="mt-2 text-2xl font-semibold text-[#3f2518]">
              {day.label}
            </p>

            <p className="text-sm text-[#6f4e3f]">{day.city}</p>

            <p className="text-sm text-[#7e6b5f]">{day.dateLabel}</p>

            {isActive && (
              <span className="absolute -bottom-2 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-[#c8b1ff]" />
            )}
          </button>
        );
      })}
    </div>
  );
}