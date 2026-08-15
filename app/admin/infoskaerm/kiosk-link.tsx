"use client";

import { useState } from "react";

// Adressen, kiosk-pc'en skal pege på.
//
// URL'en sendes ind fra serveren og er ikke skrevet ind i koden. SYSTEM.md §9
// forbyder hardcodede production-URL'er, og en fast adresse ville desuden være
// forkert i et preview-deployment.
export default function KioskLink({ url }: { url: string }) {
  const [kopieret, setKopieret] = useState(false);

  async function kopier() {
    try {
      await navigator.clipboard.writeText(url);
      setKopieret(true);
      window.setTimeout(() => setKopieret(false), 2500);
    } catch (err) {
      // Udklipsholderen kræver et sikkert domæne og en tilladelse. Falder det
      // væk, kan adressen stadig markeres og kopieres i hånden — den står
      // synligt netop derfor.
      console.error("Kunne ikke kopiere kiosklinket:", err);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        Adresse til kioskskærmen
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
          {url}
        </code>

        <button
          type="button"
          onClick={kopier}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          {kopieret ? "Kopieret ✓" : "Kopiér link"}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Sæt kioskbrowseren på denne adresse. Siden kræver ikke login og opdaterer sig selv hvert
        andet minut.
      </p>
    </div>
  );
}
