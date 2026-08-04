"use client";

import { useMemo, useState } from "react";
import { DAGE, minutesToLabel, type ScheduleEvent, type ScheduleField } from "@/features/baneplan/types";
import { ALL_ROOMS, pickInitialDay, tildelingerPaaDag } from "@/features/baneplan/layout";
import DagGitter from "./dag-gitter";

type ScheduleViewProps = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
};

// Den læsende visning: dagsfaner, gitteret for den valgte dag og et tooltip på
// tildelingerne. Selve gitteret ligger i DagGitter, som printvisningen bruger for
// alle ugens dage.
export default function ScheduleView({ fields, events }: ScheduleViewProps) {
  const days = DAGE;

  const [activeDay, setActiveDay] = useState<string>(() => pickInitialDay(days));
  const [tooltip, setTooltip] = useState<{ ev: ScheduleEvent; x: number; y: number } | null>(null);

  const dayEvents = useMemo(() => tildelingerPaaDag(events, activeDay), [events, activeDay]);

  const freeRooms = useMemo(() => {
    const used = new Set(
      dayEvents
        .map((e) => Number(String(e.room ?? "").trim()))
        .filter((n) => Number.isFinite(n))
    );
    return ALL_ROOMS.filter((n) => !used.has(n));
  }, [dayEvents]);

  if (fields.length === 0) {
    return (
      <p className="text-sm text-slate-500">Planen har endnu ingen baner eller tildelinger.</p>
    );
  }

  return (
    <div className="relative">
      <div className="flex overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDay(day)}
            className={`flex-1 whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-xs font-bold uppercase tracking-wide last:border-r-0 ${
              day === activeDay ? "bg-red-700 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <DagGitter
          fields={fields}
          events={events}
          day={activeDay}
          tooltip={{
            vis: (ev, x, y) => setTooltip({ ev, x, y }),
            skjul: () => setTooltip(null),
          }}
        />
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <strong className="mr-2 text-slate-900">Ledige omkl.:</strong>
        <span className="font-semibold text-slate-900">
          {freeRooms.length > 0 ? freeRooms.join(" · ") : "Ingen"}
        </span>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl"
          style={{ left: Math.min(tooltip.x + 14, window.innerWidth - 220), top: Math.min(tooltip.y + 14, window.innerHeight - 120) }}
        >
          <div className="mb-1.5 text-sm font-bold">{tooltip.ev.team}</div>
          <div className="font-semibold text-slate-700">
            {minutesToLabel(tooltip.ev.start)} - {minutesToLabel(tooltip.ev.end)}
          </div>
          <div className="font-semibold text-slate-700">{tooltip.ev.field}</div>
          {tooltip.ev.room && tooltip.ev.room !== "-" && (
            <div className="font-semibold text-slate-700">Omkl. {tooltip.ev.room}</div>
          )}
        </div>
      )}
    </div>
  );
}
