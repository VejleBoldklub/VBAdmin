"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { minutesToLabel, type ScheduleEvent } from "@/features/baneplan/types";
import { categoryClass, categorySwatch } from "./event-styles";

export type DragKind = "move" | "resize-top" | "resize-bottom";

type EventBoxProps = {
  ev: ScheduleEvent;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  selected: boolean;
  dragging: boolean;
  onPointerDownBody: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerDownResize: (e: PointerEvent<HTMLDivElement>, kant: "top" | "bottom") => void;
  onPatch: (patch: Partial<ScheduleEvent>) => void;
  onOpenMenu: (x: number, y: number) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
};

// Højdegrænser for hvor meget der kan være i boksen. En tildeling på 15 minutter
// er kun 20 px høj, så indholdet må skrumpe frem for at blive klippet.
const HOEJDE_TIL_TID = 62;
const HOEJDE_TIL_TO_LINJER = 46;

export default function EventBox({
  ev,
  top,
  height,
  leftPct,
  widthPct,
  selected,
  dragging,
  onPointerDownBody,
  onPointerDownResize,
  onPatch,
  onOpenMenu,
  onKeyDown,
}: EventBoxProps) {
  const rum = ev.room ?? "";

  function gemHold(vaerdi: string) {
    if (vaerdi !== ev.team) onPatch({ team: vaerdi });
  }

  function gemRum(vaerdi: string) {
    if (vaerdi !== rum) onPatch({ room: vaerdi });
  }

  // Enter gemmer, Escape fortryder. stopPropagation er nødvendig, så piletaster
  // og Delete under skrivning ikke også flytter eller sletter boksen.
  function feltTaster(
    e: KeyboardEvent<HTMLInputElement>,
    original: string,
    gem: (vaerdi: string) => void
  ) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      gem(e.currentTarget.value);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.currentTarget.value = original;
      e.currentTarget.blur();
    }
  }

  const visTid = height >= HOEJDE_TIL_TID;
  const toLinjer = height >= HOEJDE_TIL_TO_LINJER;
  const feltKlasse =
    "w-full min-w-0 rounded bg-transparent text-center leading-tight outline-none " +
    "hover:bg-white/50 focus:bg-white focus:ring-1 focus:ring-red-700";

  // Felterne er ukontrollerede. key'en indeholder værdien, så et felt remounter
  // med den nye værdi, når tildelingen ændres udefra — fx ved Dupliker — mens
  // det man selv skriver ikke bliver overskrevet undervejs.
  const holdFelt = (ekstra: string) => (
    <input
      key={`hold-${ev.id}-${ev.team}`}
      defaultValue={ev.team}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => gemHold(e.currentTarget.value)}
      onKeyDown={(e) => feltTaster(e, ev.team, gemHold)}
      placeholder="Holdnavn"
      aria-label="Holdnavn"
      className={`${feltKlasse} ${ekstra}`}
    />
  );

  const rumFelt = (ekstra: string) => (
    <input
      key={`rum-${ev.id}-${rum}`}
      defaultValue={rum}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => gemRum(e.currentTarget.value)}
      onKeyDown={(e) => feltTaster(e, rum, gemRum)}
      placeholder="-"
      aria-label="Omklædningsrum"
      className={`${feltKlasse} ${ekstra}`}
    />
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${ev.team || "Uden navn"}, ${minutesToLabel(ev.start)} til ${minutesToLabel(
        ev.end
      )}, ${ev.field}`}
      onPointerDown={onPointerDownBody}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e.clientX, e.clientY);
      }}
      className={`absolute flex flex-col overflow-hidden rounded-md border-2 px-1.5 py-1 text-center shadow-sm ${categoryClass(
        ev.category
      )} ${
        selected ? "z-20 ring-2 ring-red-700 ring-offset-1" : "hover:ring-1 hover:ring-slate-400"
      } ${dragging ? "z-30 opacity-90 shadow-lg" : ""} ${
        toLinjer ? "justify-center" : "justify-start"
      }`}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
        // Uden dette overtager browseren berøringen til scroll, og træk på touch
        // bliver umuligt. Konsekvensen er, at man ikke kan scrolle ved at starte
        // fingeren på en boks — det gøres på det tomme gitter i stedet.
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {/* Håndtag til at ændre varighed. Ligger over indholdet, men er kun 8 px. */}
      <div
        onPointerDown={(e) => onPointerDownResize(e, "top")}
        className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"
        style={{ touchAction: "none" }}
        aria-hidden
      >
        {selected && <div className="mx-auto mt-0.5 h-0.5 w-6 rounded-full bg-red-700/70" />}
      </div>
      <div
        onPointerDown={(e) => onPointerDownResize(e, "bottom")}
        className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
        style={{ touchAction: "none" }}
        aria-hidden
      >
        {selected && <div className="mx-auto mt-1 h-0.5 w-6 rounded-full bg-red-700/70" />}
      </div>

      {/* Kategori-chip. Nødvendig på touch, hvor der ikke findes højreklik. */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onOpenMenu(r.left, r.bottom + 4);
        }}
        title="Skift kategori"
        aria-label="Skift kategori"
        className={`absolute right-1 top-1 z-10 h-3 w-3 rounded-full ring-1 ring-white/70 ${categorySwatch(
          ev.category
        )} hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700`}
      />

      {visTid && (
        <div className="pointer-events-none pr-4 text-[10px] font-semibold leading-none opacity-70">
          {minutesToLabel(ev.start)}–{minutesToLabel(ev.end)}
        </div>
      )}

      {toLinjer ? (
        <>
          {holdFelt("pr-3 text-xs font-semibold")}
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] leading-tight opacity-90">
            <span className="pointer-events-none">Omkl.</span>
            {rumFelt("w-8")}
          </div>
        </>
      ) : (
        <div className="flex min-w-0 items-center gap-1">
          {holdFelt("flex-1 pr-3 text-[11px] font-semibold")}
          {rumFelt("w-6 text-[10px]")}
        </div>
      )}
    </div>
  );
}
