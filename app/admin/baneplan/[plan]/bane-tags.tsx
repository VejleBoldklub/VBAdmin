"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { flytElement, indsaetIndeks, type TagRect } from "@/features/baneplan/layout";
import type { ScheduleField } from "@/features/baneplan/types";

type BaneTagsProps = {
  fields: ScheduleField[];
  onOmroker: (fields: ScheduleField[]) => void;
  onFjern: (navn: string) => void;
  onTilfoej: () => void;
};

// Igangværende træk. `maal` er indsætningspunktet i den oprindelige liste, som
// indsaetIndeks regner det ud, og `markering` er den frosne geometri til stregen,
// der viser hvor banen lander.
type Traek = {
  fra: number;
  dx: number;
  dy: number;
  maal: number;
  markering: { left: number; top: number; height: number } | null;
};

// Hvor langt markøren skal føres, før et tryk regnes som et træk. Uden den ville
// et almindeligt klik på et tag sætte trækket i gang og lade en markering blinke.
const TRAEK_GRAENSE = 4;

// Banelisten. Rækkefølgen her er kolonnernes rækkefølge i skemaet — se
// kommentaren over flytElement i features/baneplan/layout.ts — så listen er
// ikke kun til- og fravalg, den er også selve omrokeringen.
//
// Trækket er håndrullet på pointer-hændelser, som resten af baneplaneditoren.
// Det holder modulet fri af et drag-and-drop-bibliotek, og geometrien er
// alligevel den samme slags: mål rects ved trækkets start, og lad dem stå fast
// undervejs.
export default function BaneTags({ fields, onOmroker, onFjern, onTilfoej }: BaneTagsProps) {
  const [traek, setTraek] = useState<Traek | null>(null);
  const [besked, setBesked] = useState<string>("");

  const rodRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef(new Map<string, HTMLSpanElement>());

  function maalRects(): TagRect[] {
    return fields.map((f) => {
      const r = tagRefs.current.get(f.name)?.getBoundingClientRect();
      return { left: r?.left ?? 0, right: r?.right ?? 0, top: r?.top ?? 0, bottom: r?.bottom ?? 0 };
    });
  }

  // Stregen tegnes absolut oven på rækken ud fra de frosne rects, så den ikke
  // selv skubber til tagsene og gør de netop målte tal forældede.
  function markeringFor(rects: TagRect[], maal: number) {
    const rod = rodRef.current?.getBoundingClientRect();
    if (!rod || rects.length === 0) return null;
    const efterSidste = maal >= rects.length;
    const r = rects[efterSidste ? rects.length - 1 : maal];
    return {
      left: (efterSidste ? r.right + 3 : r.left - 3) - rod.left,
      top: r.top - rod.top,
      height: r.bottom - r.top,
    };
  }

  function startTraek(e: PointerEvent<HTMLSpanElement>, index: number) {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const rects = maalRects();
    const startX = e.clientX;
    const startY = e.clientY;
    let aktiv = false;
    let maal = index;

    const fanget = e.currentTarget;
    try {
      fanget.setPointerCapture(e.pointerId);
    } catch {
      // Ældre browsere uden pointer capture klarer sig med window-lytterne.
    }

    function flyt(pe: globalThis.PointerEvent) {
      const dx = pe.clientX - startX;
      const dy = pe.clientY - startY;
      if (!aktiv && Math.abs(dx) < TRAEK_GRAENSE && Math.abs(dy) < TRAEK_GRAENSE) return;
      aktiv = true;
      maal = indsaetIndeks(rects, pe.clientX, pe.clientY);
      setTraek({ fra: index, dx, dy, maal, markering: markeringFor(rects, maal) });
    }

    function afslut(gem: boolean) {
      window.removeEventListener("pointermove", flyt);
      window.removeEventListener("pointerup", slip);
      window.removeEventListener("pointercancel", annuller);
      try {
        fanget.releasePointerCapture(e.pointerId);
      } catch {
        // Capture kan allerede være sluppet, fx hvis pointeren blev afbrudt.
      }
      setTraek(null);
      if (!gem || !aktiv) return;
      // Landede banen samme sted, er der intet at gemme — og kladden skal ikke
      // markeres ændret af et træk, der ikke flyttede noget.
      if (maal === index || maal === index + 1) return;
      onOmroker(flytElement(fields, index, maal));
      meld(fields[index].name, maal > index ? maal - 1 : maal);
    }

    const slip = () => afslut(true);
    const annuller = () => afslut(false);

    window.addEventListener("pointermove", flyt);
    window.addEventListener("pointerup", slip);
    window.addEventListener("pointercancel", annuller);
  }

  // Tastaturbetjening, så rækkefølgen også kan ændres uden mus. Fokus følger med
  // banen af sig selv: tagsene har navnet som React-key, så knappen beholder sin
  // DOM-node, når listen skifter rækkefølge.
  function taster(e: KeyboardEvent<HTMLSpanElement>, index: number) {
    const ven = e.key === "ArrowLeft";
    const hoj = e.key === "ArrowRight";
    if (!ven && !hoj) return;
    e.preventDefault();
    const til = index + (hoj ? 1 : -1);
    if (til < 0 || til >= fields.length) return;
    // flytElement regner i indsætningspunkter; et skridt til højre er derfor to
    // pladser frem, fordi banen selv fylder den første.
    onOmroker(flytElement(fields, index, hoj ? index + 2 : index - 1));
    meld(fields[index].name, til);
  }

  function meld(navn: string, plads: number) {
    setBesked(`${navn} er nu nr. ${plads + 1} af ${fields.length}`);
  }

  return (
    <>
      <div ref={rodRef} className="relative mt-2 flex flex-wrap items-center gap-2">
        {fields.map((f, i) => {
          const trukket = traek?.fra === i;
          return (
            <span
              key={f.name}
              className={`flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-2 pr-3 text-sm text-slate-700 ${
                trukket ? "relative z-10 shadow-md ring-2 ring-red-700" : ""
              }`}
              style={trukket ? { transform: `translate(${traek.dx}px, ${traek.dy}px)` } : undefined}
            >
              <span
                ref={(el) => {
                  if (el) tagRefs.current.set(f.name, el);
                  else tagRefs.current.delete(f.name);
                }}
                role="button"
                tabIndex={0}
                aria-label={`${f.name}, nr. ${i + 1} af ${fields.length}. Træk eller brug venstre og højre piletast for at flytte banen.`}
                aria-keyshortcuts="ArrowLeft ArrowRight"
                onPointerDown={(e) => startTraek(e, i)}
                onKeyDown={(e) => taster(e, i)}
                // Uden dette overtager browseren berøringen som en rulning, og
                // trækket får aldrig sine pointermove-hændelser på touch.
                style={{ touchAction: "none" }}
                className="flex cursor-grab items-center gap-1.5 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                <GrebIkon />
                {f.name}
              </span>
              <button
                type="button"
                // Ellers ville et klik på krydset også sætte et træk i gang.
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onFjern(f.name)}
                aria-label={`Fjern ${f.name}`}
                className="text-slate-400 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                x
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={onTilfoej}
          className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          + Tilføj bane
        </button>

        {traek?.markering && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute w-0.5 rounded-full bg-red-700"
            style={{
              left: traek.markering.left,
              top: traek.markering.top,
              height: traek.markering.height,
            }}
          />
        )}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {besked}
      </span>
    </>
  );
}

function GrebIkon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 16"
      className="h-3.5 w-2.5 shrink-0 text-slate-400"
      fill="currentColor"
    >
      <circle cx="2.5" cy="3" r="1.4" />
      <circle cx="7.5" cy="3" r="1.4" />
      <circle cx="2.5" cy="8" r="1.4" />
      <circle cx="7.5" cy="8" r="1.4" />
      <circle cx="2.5" cy="13" r="1.4" />
      <circle cx="7.5" cy="13" r="1.4" />
    </svg>
  );
}
