"use client";

import type { RefObject } from "react";
import {
  BESKED_FELT,
  GRAENSER,
  LOGO,
  SKRIFTER,
  type BilledElement,
  type BoksElement,
  type DesignElement,
  type TekstElement,
} from "@/lib/infoskaerm/design";
import { skriftFamilie } from "@/lib/infoskaerm/skrifttyper";
import { Etiket, FarveFelt, FELT, KNAP, TalFelt, Valg } from "./felter";

// Panelet ved siden af lærredet med det valgte elements egenskaber.

type Fælles = {
  // samle: ændringer med samme nøgle lige efter hinanden bliver ét trin i
  // fortryd-historikken, så hvert tastetryk i et tekstfelt ikke er sit eget.
  opdater: (felter: Partial<DesignElement>, samle?: string) => void;
};

export function ElementPanel({
  element,
  opdater,
  tekstRef,
  onFlyt,
  onDupliker,
  onSlet,
  onUdskiftBillede,
  onOriginalProportion,
}: Fælles & {
  element: DesignElement;
  tekstRef: RefObject<HTMLTextAreaElement | null>;
  onFlyt: (retning: "frem" | "tilbage" | "forrest" | "bagerst") => void;
  onDupliker: () => void;
  onSlet: () => void;
  onUdskiftBillede: () => void;
  onOriginalProportion: () => void;
}) {
  const e = element;
  const titel = e.type === "tekst" ? "Tekst" : e.type === "billede" ? "Billede" : "Felt";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-slate-950">{titel}</p>
        <button
          type="button"
          onClick={onSlet}
          className="rounded-lg px-2.5 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Slet
        </button>
      </div>

      {e.type === "tekst" && <TekstPanel e={e} opdater={opdater} tekstRef={tekstRef} />}
      {e.type === "billede" && (
        <BilledPanel
          e={e}
          opdater={opdater}
          onUdskift={onUdskiftBillede}
          onOriginalProportion={onOriginalProportion}
        />
      )}
      {e.type === "boks" && <BoksPanel e={e} opdater={opdater} />}

      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
        <TalFelt navn="X" vaerdi={e.x} onChange={(x) => opdater({ x }, "x")} />
        <TalFelt navn="Y" vaerdi={e.y} onChange={(y) => opdater({ y }, "y")} />
        <TalFelt
          navn="Bredde"
          vaerdi={e.b}
          min={GRAENSER.minMaal}
          onChange={(b) => opdater({ b: Math.max(GRAENSER.minMaal, b) }, "b")}
        />
        <TalFelt
          navn="Højde"
          vaerdi={e.h}
          min={GRAENSER.minMaal}
          onChange={(h) => opdater({ h: Math.max(GRAENSER.minMaal, h) }, "h")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={KNAP} onClick={() => onFlyt("forrest")}>
          Forrest
        </button>
        <button type="button" className={KNAP} onClick={() => onFlyt("frem")}>
          Frem
        </button>
        <button type="button" className={KNAP} onClick={() => onFlyt("tilbage")}>
          Tilbage
        </button>
        <button type="button" className={KNAP} onClick={() => onFlyt("bagerst")}>
          Bagerst
        </button>
        <button type="button" className={KNAP} onClick={onDupliker}>
          Dupliker
        </button>
      </div>
    </div>
  );
}

function TekstPanel({
  e,
  opdater,
  tekstRef,
}: Fælles & { e: TekstElement; tekstRef: RefObject<HTMLTextAreaElement | null> }) {
  return (
    <>
      <Etiket navn="Tekst">
        <textarea
          ref={tekstRef}
          rows={4}
          className={FELT}
          value={e.tekst}
          maxLength={GRAENSER.tekst}
          onChange={(ev) => opdater({ tekst: ev.target.value }, "tekst")}
        />
      </Etiket>
      <button
        type="button"
        className={`${KNAP} w-full`}
        onClick={() => opdater({ tekst: e.tekst + BESKED_FELT })}
      >
        Indsæt dagens besked fra ugeplanen
      </button>
      <p className="-mt-2 text-xs text-slate-500">
        <code className="font-mono">{BESKED_FELT}</code> bliver til den besked, der er skrevet
        for dagen i ugeplanen. Er der ingen besked, og står der ikke andet i teksten, vises den
        slet ikke.
      </p>

      <Etiket navn="Skrifttype">
        <select
          className={FELT}
          value={e.skrift}
          style={{ fontFamily: skriftFamilie(e.skrift) }}
          onChange={(ev) => opdater({ skrift: ev.target.value as TekstElement["skrift"] })}
        >
          {SKRIFTER.map((s) => (
            <option key={s.noegle} value={s.noegle} style={{ fontFamily: skriftFamilie(s.noegle) }}>
              {s.navn}
            </option>
          ))}
        </select>
      </Etiket>

      <div className="grid grid-cols-2 gap-2">
        <TalFelt
          navn="Størrelse"
          vaerdi={e.stoerrelse}
          min={GRAENSER.stoerrelse.min}
          maks={GRAENSER.stoerrelse.maks}
          onChange={(stoerrelse) => opdater({ stoerrelse }, "stoerrelse")}
        />
        <TalFelt
          navn="Linjehøjde"
          vaerdi={e.linjehoejde}
          min={GRAENSER.linjehoejde.min}
          maks={GRAENSER.linjehoejde.maks}
          trin={0.05}
          onChange={(linjehoejde) => opdater({ linjehoejde }, "linjehoejde")}
        />
      </div>
      <input
        type="range"
        aria-label="Skriftstørrelse"
        className="w-full accent-red-700"
        min={GRAENSER.stoerrelse.min}
        max={200}
        value={Math.min(200, e.stoerrelse)}
        onChange={(ev) => opdater({ stoerrelse: Number(ev.target.value) }, "stoerrelse")}
      />

      <div className="grid grid-cols-2 gap-2">
        <FarveFelt navn="Farve" vaerdi={e.farve} onChange={(farve) => opdater({ farve }, "farve")} />
        <div>
          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Stil
          </span>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              aria-pressed={e.fed}
              onClick={() => opdater({ fed: !e.fed })}
              className={`${KNAP} font-black ${e.fed ? "border-red-700 bg-red-50" : ""}`}
            >
              F
            </button>
            <button
              type="button"
              aria-pressed={e.kursiv}
              onClick={() => opdater({ kursiv: !e.kursiv })}
              className={`${KNAP} italic ${e.kursiv ? "border-red-700 bg-red-50" : ""}`}
            >
              K
            </button>
          </div>
        </div>
      </div>

      <Valg
        navn="Vandret"
        vaerdi={e.justering}
        valg={[
          { v: "venstre", tekst: "Venstre" },
          { v: "midt", tekst: "Midt" },
          { v: "hoejre", tekst: "Højre" },
        ]}
        onChange={(justering) => opdater({ justering })}
      />
      <Valg
        navn="Lodret"
        vaerdi={e.lodret}
        valg={[
          { v: "top", tekst: "Top" },
          { v: "midt", tekst: "Midt" },
          { v: "bund", tekst: "Bund" },
        ]}
        onChange={(lodret) => opdater({ lodret })}
      />

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            className="accent-red-700"
            checked={e.baggrund !== null}
            onChange={(ev) => opdater({ baggrund: ev.target.checked ? "#FFFFFF" : null })}
          />
          Baggrund bag teksten
        </label>
        {e.baggrund !== null && (
          <div className="grid grid-cols-3 gap-2">
            <FarveFelt
              navn="Farve"
              vaerdi={e.baggrund}
              onChange={(baggrund) => opdater({ baggrund }, "baggrund")}
            />
            <TalFelt
              navn="Hjørner"
              vaerdi={e.radius}
              min={0}
              maks={GRAENSER.radius}
              onChange={(radius) => opdater({ radius }, "radius")}
            />
            <TalFelt
              navn="Luft"
              vaerdi={e.polstring}
              min={0}
              maks={GRAENSER.polstring}
              onChange={(polstring) => opdater({ polstring }, "polstring")}
            />
          </div>
        )}
      </div>
    </>
  );
}

function BilledPanel({
  e,
  opdater,
  onUdskift,
  onOriginalProportion,
}: Fælles & { e: BilledElement; onUdskift: () => void; onOriginalProportion: () => void }) {
  return (
    <>
      <Valg
        navn="Tilpasning"
        vaerdi={e.tilpasning}
        valg={[
          { v: "fyld", tekst: "Fyld rammen" },
          { v: "hele", tekst: "Hele billedet" },
        ]}
        onChange={(tilpasning) => opdater({ tilpasning })}
      />
      <TalFelt
        navn="Runde hjørner"
        vaerdi={e.radius}
        min={0}
        maks={GRAENSER.radius}
        onChange={(radius) => opdater({ radius }, "radius")}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={KNAP} onClick={onOriginalProportion}>
          Original proportion
        </button>
        {e.sti !== LOGO && (
          <button type="button" className={KNAP} onClick={onUdskift}>
            Udskift billede
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Hold Shift nede, mens du trækker i et hjørne, for at ændre størrelsen frit.
      </p>
    </>
  );
}

function BoksPanel({ e, opdater }: Fælles & { e: BoksElement }) {
  return (
    <>
      <FarveFelt navn="Farve" vaerdi={e.farve} onChange={(farve) => opdater({ farve }, "farve")} />
      <div className="grid grid-cols-2 gap-2">
        <TalFelt
          navn="Hjørner"
          vaerdi={e.radius}
          min={0}
          maks={GRAENSER.radius}
          onChange={(radius) => opdater({ radius }, "radius")}
        />
        <TalFelt
          navn="Synlighed %"
          vaerdi={e.opacitet}
          min={0}
          maks={100}
          onChange={(opacitet) => opdater({ opacitet: Math.min(100, Math.max(0, opacitet)) }, "opacitet")}
        />
      </div>
    </>
  );
}
