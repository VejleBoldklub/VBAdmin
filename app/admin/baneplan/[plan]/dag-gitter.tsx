"use client";

import { minutesToLabel, type ScheduleEvent, type ScheduleField } from "@/features/baneplan/types";
import {
  HEADER_H,
  layoutEvents,
  MIN_FIELD_W,
  rangeForDay,
  ROW_H,
  tildelingerPaaDag,
  TIME_W,
} from "@/features/baneplan/layout";
import { categoryClass } from "./event-styles";

export type DagGitterTooltip = {
  // Kaldes både når markøren kommer ind på en boks og når den flytter sig på
  // den, så den kaldende kan holde et tooltip ved markøren.
  vis: (ev: ScheduleEvent, x: number, y: number) => void;
  skjul: () => void;
};

type DagGitterProps = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
  day: string;
  // Udelades tooltip'et, er gitteret helt uden interaktion. Det er sådan
  // printvisningen bruger det.
  tooltip?: DagGitterTooltip;
  tilPrint?: boolean;
};

// Rækkehøjde på papir. Lavere end skærmens 26 px, fordi en A4 på tværs med 8 mm
// margin kun har 734 px i højden, og en hverdag med skærmens højde fylder 732 px
// alene. Med 20 px fylder dagen 576 px, og der er plads til dagens overskrift og
// til titelblokken, som står oven over den første dag.
const PRINT_ROW_H = 20;

// Én dags tidsgitter: TID-kolonnen, banekolonnerne og tildelingerne som bokse.
//
// Delt mellem den læsende ScheduleView — som lægger dagsfaner og tooltip
// ovenpå — og printvisningen, der tegner alle ugens dage efter hinanden. De to
// må ikke tegne hver sit gitter; så ville en PDF til godkendelse med tiden komme
// til at vise noget andet end skærmen.
//
// Redigering hører ikke her: ScheduleEditor har sit eget gitter, fordi det skal
// kunne måle baner, vise træk undervejs og huske hvad der er valgt.
export default function DagGitter({
  fields,
  events,
  day,
  tooltip,
  tilPrint = false,
}: DagGitterProps) {
  const range = rangeForDay(day);
  const rowH = tilPrint ? PRINT_ROW_H : ROW_H;
  const ppm = rowH / 15;
  const bodyH = (range.max - range.min) * ppm;
  const dayEvents = tildelingerPaaDag(events, day);

  return (
    <div
      className="relative grid rounded-lg border border-slate-200 bg-white"
      style={{
        // På papir mister kolonnerne deres mindstebredde, så gitteret krymper til
        // sidens bredde. Beholdt vi gulvet, ville de sidste baner blive klippet
        // af — der er ingen vandret scroll på et ark papir.
        gridTemplateColumns: tilPrint
          ? `${TIME_W}px repeat(${fields.length}, 1fr)`
          : `${TIME_W}px repeat(${fields.length}, minmax(${MIN_FIELD_W}px, 1fr))`,
        gridTemplateRows: `${HEADER_H}px ${bodyH}px`,
        minWidth: tilPrint ? undefined : TIME_W + fields.length * MIN_FIELD_W,
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
                  onMouseEnter={tooltip ? (e) => tooltip.vis(ev, e.clientX, e.clientY) : undefined}
                  onMouseMove={tooltip ? (e) => tooltip.vis(ev, e.clientX, e.clientY) : undefined}
                  onMouseLeave={tooltip ? () => tooltip.skjul() : undefined}
                >
                  <div className="text-xs font-semibold leading-tight">{ev.team}</div>
                  {tilPrint ? (
                    // På papir står tiden i boksen. På skærmen kan man læse den
                    // af tidsaksen eller holde markøren over boksen; på en
                    // udskrift er der ingen markør, og en bred plan er nem at
                    // læse forkert på tværs.
                    //
                    // Tid og omklædning deler én linje, så en kort tildeling ikke
                    // skal have tre linjer i en boks, der kun har plads til to.
                    <div className="text-[9px] leading-tight opacity-80">
                      {minutesToLabel(ev.start)}–{minutesToLabel(ev.end)}
                      {hasRoom && ` · Omkl. ${ev.room}`}
                    </div>
                  ) : (
                    hasRoom && (
                      <div className="mt-1 text-[11px] leading-tight opacity-90">Omkl. {ev.room}</div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
