"use client";

import { useMemo, useState } from "react";
import { DAGE, minutesToLabel, type ScheduleEvent, type ScheduleField } from "@/features/baneplan/types";

type ScheduleViewProps = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
};

const ALL_ROOMS = [1, 2, 3, 4, 5, 6, 8, 10, 12];
const LOCKED_ROOMS = new Set([7, 9]);

const weekdayMap = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

function pickInitialDay(availableDays: string[]): string {
  const today = weekdayMap[new Date().getDay()];
  return availableDays.includes(today) ? today : availableDays[0] ?? "Mandag";
}

function rangeForDay(day: string) {
  return day === "Lørdag" || day === "Søndag"
    ? { min: 9 * 60, max: 14 * 60 }
    : { min: 14 * 60 + 30, max: 21 * 60 };
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

type LaidOutEvent = ScheduleEvent & { col: number; cols: number };

function layoutEvents(events: ScheduleEvent[]): LaidOutEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const clusters: { start: number; end: number; events: ScheduleEvent[] }[] = [];

  for (const ev of sorted) {
    const hit = clusters.find((c) => c.events.some((x) => overlaps(x, ev)));
    if (hit) {
      hit.events.push(ev);
      hit.start = Math.min(hit.start, ev.start);
      hit.end = Math.max(hit.end, ev.end);
    } else {
      clusters.push({ start: ev.start, end: ev.end, events: [ev] });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (clusters[i].events.some((a) => clusters[j].events.some((b) => overlaps(a, b)))) {
          clusters[i].events.push(...clusters[j].events);
          clusters[i].start = Math.min(clusters[i].start, clusters[j].start);
          clusters[i].end = Math.max(clusters[i].end, clusters[j].end);
          clusters.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  const out: LaidOutEvent[] = [];
  for (const c of clusters) {
    const cols: ScheduleEvent[][] = [];
    const laidOut: LaidOutEvent[] = [];
    c.events
      .sort((a, b) => a.start - b.start || a.end - b.end)
      .forEach((ev) => {
        let col = 0;
        while (cols[col] && cols[col].some((x) => overlaps(x, ev))) col++;
        (cols[col] ||= []).push(ev);
        laidOut.push({ ...ev, col, cols: 0 }); // cols udfyldes, når klyngens bredde kendes
      });
    for (const ev of laidOut) ev.cols = cols.length;
    out.push(...laidOut);
  }
  return out;
}

const ROW_H = 26; // px per 15 min
const TIME_W = 84;
const FIELD_W = 170;
const HEADER_H = 56;

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
    return ALL_ROOMS.filter((n) => !LOCKED_ROOMS.has(n) && !used.has(n));
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
            gridTemplateColumns: `${TIME_W}px repeat(${fields.length}, ${FIELD_W}px)`,
            gridTemplateRows: `${HEADER_H}px ${bodyH}px`,
            minWidth: TIME_W + fields.length * FIELD_W,
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
                      className={`absolute overflow-hidden rounded-md border-2 px-1.5 py-1 text-center shadow-sm ${categoryClass(
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

function categoryClass(category: ScheduleEvent["category"]): string {
  switch (category) {
    case "piger":
      return "bg-green-100 border-green-600 text-green-950";
    case "drenge":
      return "bg-amber-100 border-amber-500 text-amber-950";
    case "akademi":
      return "bg-sky-100 border-sky-500 text-sky-950";
    case "future":
      return "bg-blue-100 border-blue-400 text-blue-950";
    case "reserveret":
      return "bg-slate-100 border-slate-500 text-slate-800 [background-image:repeating-linear-gradient(135deg,#f1f2f4_0,#f1f2f4_8px,#e2e5e9_8px,#e2e5e9_16px)]";
    default:
      return "bg-slate-100 border-slate-400 text-slate-900";
  }
}
