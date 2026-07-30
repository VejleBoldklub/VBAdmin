"use client";

import {
  ANTAL_SLOTS,
  GITTER_FRA,
  tilSegmenter,
  type Slot,
  type SlotStatus,
} from "@/features/lokalebooking/gitter";
import { minutterTilKlokke, SNAP } from "@/features/lokalebooking/regler";
import { dagNavn, dagTal } from "@/features/lokalebooking/uge";

// Ugens syv søjler med kvarterer.
//
// Kvartererne kommer færdigudregnet fra serveren, se gitter.ts. Denne fil tegner
// dem og holder styr på, hvad brugeren har valgt — ingen tidsregning.

const SLOT_H = 12; // px pr. kvarter. 52 kvarterer bliver 624 px.

type UgeTabelProps = {
  datoer: string[];
  slots: Slot[][];
  iDag: string;
  valgt: { dato: string; start: number; slut: number } | null;
  vaelg: (dato: string, start: number) => void;
};

const BLOK: Record<Exclude<SlotStatus, "ledig">, { klasse: string; tekst: string }> = {
  optaget: {
    klasse: "bg-slate-700 text-white",
    tekst: "Optaget",
  },
  // Rødtonet, ikke grå: en afventende booking holder tiden, men er ikke afgjort.
  // Den skal kunne skelnes fra både en bekræftet booking og fra lukket tid.
  afventer: {
    klasse: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200",
    tekst: "Afventer",
  },
  fortid: {
    klasse: "bg-slate-100 text-slate-400",
    tekst: "",
  },
  lukket: {
    klasse: "bg-slate-50 text-slate-400",
    tekst: "",
  },
};

export default function UgeTabel({ datoer, slots, iDag, valgt, vaelg }: UgeTabelProps) {
  const timer = Array.from({ length: ANTAL_SLOTS }, (_, i) => GITTER_FRA + i * SNAP);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="grid min-w-[640px] grid-cols-[52px_repeat(7,minmax(76px,1fr))]">
        {/* Overskriftsrække */}
        <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white" />
        {datoer.map((dato) => {
          const erIDag = dato === iDag;
          return (
            <div
              key={dato}
              className={`border-b border-r border-slate-200 px-1 py-2 text-center last:border-r-0 ${
                erIDag ? "bg-red-50" : "bg-slate-50"
              }`}
            >
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${
                  erIDag ? "text-red-700" : "text-slate-600"
                }`}
              >
                {dagNavn(dato)}
              </p>
              <p className="text-xs font-semibold text-slate-950">{dagTal(dato)}</p>
            </div>
          );
        })}

        {/* Klokkesøjlen. Klæber til venstre, så tiderne kan læses, mens der
            scrolles vandret på en telefon. */}
        <div className="sticky left-0 z-10 border-r border-slate-200 bg-white">
          {timer.map((m) => (
            <div
              key={m}
              style={{ height: SLOT_H }}
              className={`relative ${m % 60 === 0 ? "border-t border-slate-200" : ""}`}
            >
              {m % 60 === 0 && (
                <span className="absolute -top-[7px] right-1 bg-white px-0.5 text-[10px] font-medium tabular-nums text-slate-500">
                  {minutterTilKlokke(m)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Dagssøjlerne */}
        {datoer.map((dato, dagIndeks) => (
          <div key={dato} className="relative border-r border-slate-200 last:border-r-0">
            {tilSegmenter(slots[dagIndeks]).map((segment) => {
              if (segment.status !== "ledig") {
                const stil = BLOK[segment.status];
                const b = segment.booking;

                // Bookingens oplysninger vises i blokken. Se types.ts om hvorfor
                // de står på en side uden login — det er klubbens beslutning.
                //
                // En søjle er smal, og et kvarter er 12 px høj. Linjerne kommer
                // derfor på efterhånden som blokken har plads: først hvad og
                // hvem, så tidsrummet, så kontaktoplysningerne. Uanset højden
                // står det hele i title, så det kan læses ved at holde musen
                // stille, og i en skjult linje, så skærmlæsere får det med.
                const linjer = b
                  ? [
                      b.hold ? `${b.formaal} · ${b.hold}` : b.formaal,
                      b.navn,
                      `${minutterTilKlokke(segment.fra)}–${minutterTilKlokke(segment.til)}`,
                      b.mobil,
                      b.email,
                    ]
                  : [];

                const alt = b
                  ? [
                      `${stil.tekst}: ${b.formaal}`,
                      b.hold ? `Hold: ${b.hold}` : null,
                      `${b.navn}, ${b.mobil}, ${b.email}`,
                      `${minutterTilKlokke(segment.fra)}–${minutterTilKlokke(segment.til)}`,
                    ]
                      .filter(Boolean)
                      .join("\n")
                  : "";

                // Én linje fylder omkring 11 px. Et kvarter er 12, så antallet af
                // kvarterer er nogenlunde antallet af linjer, der er plads til.
                const plads = Math.max(0, segment.antal - 1);

                return (
                  <div
                    key={segment.fra}
                    title={alt || undefined}
                    style={{ height: segment.antal * SLOT_H }}
                    className={`overflow-hidden px-1 py-0.5 text-[10px] font-semibold leading-tight ${stil.klasse}`}
                  >
                    {b ? (
                      <>
                        {linjer.slice(0, plads).map((linje, i) => (
                          <span
                            key={linje + i}
                            className={`block truncate ${i === 0 ? "" : "font-normal opacity-90"}`}
                          >
                            {linje}
                          </span>
                        ))}
                        {/* Hele indholdet, også når blokken er for lav til at
                            vise det. Skærmlæsere læser det op; øjet ser det i
                            title. */}
                        <span className="sr-only">{alt}</span>
                      </>
                    ) : null}
                  </div>
                );
              }

              // Ledige kvarterer er hver sin knap, så et tidsrum kan vælges med
              // både mus og tastatur. Derfor slås de ikke sammen som de øvrige.
              return Array.from({ length: segment.antal }, (_, i) => {
                const m = segment.fra + i * SNAP;
                const erValgt =
                  valgt !== null && valgt.dato === dato && m >= valgt.start && m < valgt.slut;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => vaelg(dato, m)}
                    aria-pressed={erValgt}
                    aria-label={`Vælg ${dagNavn(dato)} ${dagTal(dato)} kl. ${minutterTilKlokke(m)}`}
                    style={{ height: SLOT_H }}
                    className={`block w-full cursor-pointer border-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 ${
                      erValgt ? "bg-red-700" : "bg-white hover:bg-red-100"
                    }`}
                  />
                );
              });
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-200 px-3 py-2.5 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-slate-300 bg-white" />
          Ledig
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-700" />
          Optaget
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-50 ring-1 ring-inset ring-red-200" />
          Afventer godkendelse
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-100" />
          Lukket eller passeret
        </span>
      </div>
    </div>
  );
}
