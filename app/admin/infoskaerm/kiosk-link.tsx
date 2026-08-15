"use client";

import { useRef, useState } from "react";

type Tilstand = "klar" | "kopieret" | "fejlede";

// Adressen, kiosk-pc'en skal pege på.
//
// URL'en sendes ind fra serveren og er ikke skrevet ind i koden. SYSTEM.md §9
// forbyder hardcodede production-URL'er, og en fast adresse ville desuden være
// forkert i et preview-deployment.
export default function KioskLink({ url }: { url: string }) {
  const [tilstand, setTilstand] = useState<Tilstand>("klar");
  const feltRef = useRef<HTMLInputElement>(null);
  const nulstilRef = useRef<number | undefined>(undefined);

  function meld(ny: Tilstand) {
    setTilstand(ny);
    window.clearTimeout(nulstilRef.current);
    nulstilRef.current = window.setTimeout(() => setTilstand("klar"), 3000);
  }

  // Reserveudgaven: markér feltet og bed browseren kopiere markeringen.
  //
  // execCommand er forældet, men den virker i tilfælde, hvor den asynkrone
  // udklipsholder afviser — typisk fordi dokumentet ikke har fokus, hvilket
  // blandt andet sker, når DevTools er åbne. Den kræver ingen tilladelse.
  function kopierViaMarkering(): boolean {
    const felt = feltRef.current;
    if (!felt) return false;

    felt.focus();
    felt.select();
    felt.setSelectionRange(0, url.length);

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }

  async function kopier() {
    // Den asynkrone udklipsholder findes kun i et sikkert domæne, og den
    // afviser, hvis dokumentet ikke har fokus. Begge dele fejler tavst uden
    // reserven nedenfor.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        meld("kopieret");
        return;
      }
    } catch (err) {
      console.error("Udklipsholderen afviste, prøver markering i stedet:", err);
    }

    meld(kopierViaMarkering() ? "kopieret" : "fejlede");
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        Adresse til kioskskærmen
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {/* Et readOnly-inputfelt frem for <code>. Reserven har brug for et felt,
            den kan markere, og feltet gør det samtidig let at kopiere i hånden,
            hvis begge veje fejler. */}
        <input
          ref={feltRef}
          readOnly
          value={url}
          aria-label="Adresse til kioskskærmen"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        />

        <button
          type="button"
          onClick={kopier}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 ${
            tilstand === "kopieret"
              ? "border-green-600 bg-green-600 text-white"
              : tilstand === "fejlede"
                ? "border-red-700 bg-red-50 text-red-800"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
          }`}
        >
          {tilstand === "kopieret"
            ? "Kopieret!"
            : tilstand === "fejlede"
              ? "Kunne ikke kopiere"
              : "Kopiér link"}
        </button>
      </div>

      {/* aria-live, så en skærmlæser også får udfaldet at vide. Beskeden er
          tom i hviletilstand, ellers ville den blive læst op ved hver optegning. */}
      <p aria-live="polite" className="sr-only">
        {tilstand === "kopieret" ? "Adressen er kopieret." : ""}
        {tilstand === "fejlede" ? "Adressen kunne ikke kopieres." : ""}
      </p>

      <p className="mt-2 text-sm text-slate-600">
        {tilstand === "fejlede"
          ? "Browseren tillod ikke kopiering. Adressen er markeret i feltet — tryk Ctrl+C."
          : "Sæt kioskbrowseren på denne adresse. Siden kræver ikke login og opdaterer sig selv hvert andet minut."}
      </p>
    </div>
  );
}
