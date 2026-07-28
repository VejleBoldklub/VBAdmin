"use client";

import { useMemo, useState } from "react";
import { DAGE, minutesToLabel, type ScheduleEvent, type ScheduleField } from "@/features/baneplan/types";
import {
  ALL_ROOMS,
  HEADER_H,
  layoutEvents,
  MIN_FIELD_W,
  pickInitialDay,
  rangeForDay,
  ROW_H,
  TIME_W,
} from "@/features/baneplan/layout";
import { categoryClass } from "./event-styles";

type ScheduleViewProps = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
};

export default function ScheduleView({ fields, events }: ScheduleViewProps) {
  const days = useMemo(() => {
    const present = new Set(events.map((e) => e.day));
    return DAGE.filter((d) => present.has(d)).length > 0 ? DAGE : DAGE;
  }, [events]);

  const [activeDay, setActiveDay] = useState<string>(() => pickInitialDay(days));
  const [tooltip, setTooltip] = useState<{ ev: ScheduleEvent; x: number; y: number } | null>(null);

  const range = rangeForDay(activeDay);
  const ppm = ROW_H / 15;
  const bodyH = (range.max - range.min) * ppm;

  const dayEvents = events.filter(
    (e) => e.day === activeDay && e.end > range.min && e.start < range.max
  );

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
        <div
          className="relative grid rounded-lg border border-slate-200 bg-white"
          style={{
            gridTemplateColumns: `${TIME_W}px repeat(${fields.length}, minmax(${MIN_FIELD_W}px, 1fr))`,
            gridTemplateRows: `${HEADER_H}px ${bodyH}px`,
            minWidth: TIME_W + fields.length * MIN_FIELD_W,
          }}
        >
          <div
            className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-slate-200 bg-red-700 text-sm font-bold text-white"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            TID
          </div>
          {fields.map((f, i) => (
            <div
              key={f.name}
              className="flex flex-col items-center justify-center border-b border-r border-slate-700 bg-slate-900 px-1 py-1 text-center text-white last:border-r-0"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <span className="text-sm font-bold leading-none">{f.name}</span>
              {f.type && <span className="mt-1 text-[10px] leading-none text-slate-300">({f.type})</span>}
            </div>
          ))}

          <div
            className="sticky left-0 z-10 border-r border-slate-200 bg-white"
            style={{ gridColumn: 1, gridRow: 2, height: bodyH }}
          >
            {Array.from({ length: Math.floor((range.max - range.min) / 15) + 1 }, (_, idx) => {
              const t = range.min + idx * 15;
              if (t === range.min || t === range.max) return null;
              const isHour = t % 60 === 0;
              return (
                <div
                  key={t}
                  className={`absolute left-0 right-0 flex h-4 -translate-y-1/2 items-center justify-center text-[11px] ${
                    isHour ? "font-bold text-red-700" : "text-slate-700"
                  }`}
                  style={{ top: (t - range.min) * ppm }}
                >
                  {minutesToLabel(t)}
                </div>
              );
            })}
          </div>

          {fields.map((f, i) => {
            const laneEvents = layoutEvents(dayEvents.filter((e) => e.field === f.name));
            return (
              <div
                key={f.name}
                className="relative border-r border-slate-200 last:border-r-0"
                style={{ gridColumn: i + 2, gridRow: 2, height: bodyH }}
              >
                {laneEvents.map((ev) => {
                  const top = (Math.max(ev.start, range.min) - range.min) * ppm;
                  const height = Math.max(
                    (Math.min(ev.end, range.max) - Math.max(ev.start, range.min)) * ppm - 6,
                    24
                  );
                  const width = 100 / ev.cols;
                  const left = ev.col * width;
                  const hasRoom = ev.room && ev.room !== "-";
                  return (
                    <div
                      key={ev.id}
                      className={`absolute flex flex-col items-center justify-center overflow-hidden rounded-md border-2 px-1.5 py-1 text-center shadow-sm ${categoryClass(
                        ev.category
                      )}`}
                      style={{
                        top: top + 3,
                        height,
                        left: `calc(${left}% + 3px)`,
                        width: `calc(${width}% - 6px)`,
                      }}
                      onMouseEnter={(e) =>
                        setTooltip({ ev, x: e.clientX, y: e.clientY })
                      }
                      onMouseMove={(e) =>
                        setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className="text-xs font-semibold leading-tight">{ev.team}</div>
                      {hasRoom && <div className="mt-1 text-[11px] leading-tight opacity-90">Omkl. {ev.room}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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

