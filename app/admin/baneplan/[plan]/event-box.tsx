"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { minutesToLabel, type ScheduleEvent } from "@/features/baneplan/types";
import type { SegmentKant } from "@/features/baneplan/layout";
import { categoryClass, categorySwatch, segmentKantKlasser, segmentZ } from "./event-styles";
import { IndvendigeHjoerner } from "./indvendige-hjoerner";

export type DragKind = "move" | "resize-top" | "resize-bottom";

type EventBoxProps = {
  ev: ScheduleEvent;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  // Vandret forskydning i pixels under et træk. Boksen bliver i sin egen banes
  // DOM-node og forskydes visuelt til den bane markøren er over, så et træk
  // henover en banegrænse ikke unmounter elementet og afbryder trækket.
  offsetX: number;
  selected: boolean;
  dragging: boolean;
  // Er tildelingen delt i flere tidssegmenter (kun i det tidsrum, den
  // overlapper en anden på samme bane), er dette ét af dem. first/last siger,
  // om det er DENNE TILDELINGS øverste hhv. nederste segment — kun dér skal
  // kanten til at ændre varighed sidde, så den bliver ved den reelle start
  // hhv. slutning, uanset hvilket segment der viser tekstfelterne (se
  // visLabel).
  first: boolean;
  last: boolean;
  // Hvilket af tildelingens (nu sammenlagte) segmenter der skal vise
  // kategori-chip, tidspunkt, tekstfelter og tastaturfokus — samme udvælgelse
  // som DagGitter bruger til holdnavnet (se layoutEvents), nemlig det
  // segment, der har mest lodret plads til dem. Det er IKKE nødvendigvis
  // first: er tildelingens eget første segment kun en kort bid, hvor den
  // overlapper en anden i starten af sit forløb, ville felterne blive klemt
  // ind i den bid, mens det lange, rummelige segment stod helt tomt — præcis
  // det, der skete i den læsende visning, før DagGitter fik samme rettelse.
  visLabel: boolean;
  // Kanter og hjørner for netop dette segment — se segmentKant.
  kant: SegmentKant;
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
  offsetX,
  selected,
  dragging,
  first,
  last,
  visLabel,
  kant,
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

  // Kant og runding følger tildelingens egen form — se segmentKant — så den
  // står med én sammenhængende kant hele vejen rundt, også hvor dens bredde
  // skifter midt i forløbet. Samme klasser som DagGitter bruger.
  //
  // z-index sættes i style frem for med klasser, fordi segmentZ skal lægges
  // oven i: et segment, der rækker ind over sin nabos kant, skal også ligge
  // over naboen, når tildelingen er valgt eller trækkes.
  const zIndex = (dragging ? 30 : selected ? 20 : 0) + segmentZ(kant);

  return (
    <div
      role={visLabel ? "button" : undefined}
      tabIndex={visLabel ? 0 : -1}
      aria-hidden={visLabel ? undefined : true}
      aria-label={
        visLabel
          ? `${ev.team || "Uden navn"}, ${minutesToLabel(ev.start)} til ${minutesToLabel(
              ev.end
            )}, ${ev.field}`
          : undefined
      }
      onPointerDown={onPointerDownBody}
      onKeyDown={visLabel ? onKeyDown : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu(e.clientX, e.clientY);
      }}
      className={`absolute ${segmentKantKlasser(kant)} ${categoryClass(ev.category)} ${
        selected ? "ring-2 ring-red-700 ring-offset-1" : "hover:ring-1 hover:ring-slate-400"
      } ${dragging ? "opacity-90 shadow-lg" : ""}`}
      style={{
        top,
        height,
        zIndex: zIndex || undefined,
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
        transform: offsetX ? `translateX(${offsetX}px)` : undefined,
        // Uden dette overtager browseren berøringen til scroll, og træk på touch
        // bliver umuligt. Konsekvensen er, at man ikke kan scrolle ved at starte
        // fingeren på en boks — det gøres på det tomme gitter i stedet.
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {/* Håndtag til at ændre varighed. Ligger over indholdet, men er kun 8 px.
          Kun på tildelingens reelle top/bund — et indre segment har ingen. */}
      {first && (
        <div
          onPointerDown={(e) => onPointerDownResize(e, "top")}
          className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"
          style={{ touchAction: "none" }}
          aria-hidden
        >
          {selected && <div className="mx-auto mt-0.5 h-0.5 w-6 rounded-full bg-red-700/70" />}
        </div>
      )}
      {last && (
        <div
          onPointerDown={(e) => onPointerDownResize(e, "bottom")}
          className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
          style={{ touchAction: "none" }}
          aria-hidden
        >
          {selected && <div className="mx-auto mt-1 h-0.5 w-6 rounded-full bg-red-700/70" />}
        </div>
      )}

      <IndvendigeHjoerner kant={kant} category={ev.category} />

      {/* Indholdet klippes her og ikke på selve boksen, så de indvendige
          hjørner kan ligge uden for den. */}
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden px-1.5 py-1 text-center ${
          toLinjer ? "justify-center" : "justify-start"
        }`}
      >
        {visLabel && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
