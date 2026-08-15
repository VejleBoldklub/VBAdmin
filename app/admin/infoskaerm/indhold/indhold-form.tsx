"use client";

import { useState, useTransition } from "react";
import { headerTekstFarve, type IndholdBlokRow, type IndholdRow } from "@/lib/infoskaerm/content";
import { gemIndhold } from "./actions";

const FELT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

const TOM_BLOK: IndholdBlokRow = {
  titel_da: "",
  titel_en: "",
  tekst_da: "",
  tekst_en: "",
};

export default function IndholdForm({ start }: { start: IndholdRow }) {
  const [raekke, setRaekke] = useState<IndholdRow>(start);
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saet<K extends keyof IndholdRow>(felt: K, vaerdi: IndholdRow[K]) {
    setRaekke((r) => ({ ...r, [felt]: vaerdi }));
    setGemt(false);
  }

  function saetBlok(i: number, felt: keyof IndholdBlokRow, vaerdi: string) {
    setRaekke((r) => ({
      ...r,
      blokke: r.blokke.map((b, j) => (j === i ? { ...b, [felt]: vaerdi } : b)),
    }));
    setGemt(false);
  }

  function tilfoejBlok() {
    setRaekke((r) => ({ ...r, blokke: [...r.blokke, { ...TOM_BLOK }] }));
    setGemt(false);
  }

  function fjernBlok(i: number) {
    setRaekke((r) => ({ ...r, blokke: r.blokke.filter((_, j) => j !== i) }));
    setGemt(false);
  }

  function gem() {
    startTransition(async () => {
      try {
        const svar = await gemIndhold(raekke);

        if (svar.ok) {
          setFejl(null);
          setGemt(true);
        } else {
          setFejl(svar.fejl);
          setGemt(false);
        }
      } catch (err) {
        console.error("Kald til gemIndhold fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setGemt(false);
      }
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Overskriften vises med farvens egne koder, så en ændring kan ses med
          det samme frem for først på kioskskærmen. */}
      <div
        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
        style={{ background: raekke.farvekode, color: headerTekstFarve(raekke.farvekode) }}
      >
        <div>
          <p className="text-lg font-black">{raekke.titel || raekke.farve}</p>
          <p className="text-sm font-semibold">
            {raekke.undertitel_da} / {raekke.undertitel_en}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: raekke.lys_farvekode, color: "#111827" }}
        >
          {raekke.kortnavn}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={ETIKET}>Titel</span>
          <input
            className={`${FELT} mt-1.5`}
            value={raekke.titel}
            onChange={(e) => saet("titel", e.target.value)}
          />
        </label>

        <label className="block">
          <span className={ETIKET}>Dagens navn</span>
          <input
            className={`${FELT} mt-1.5`}
            value={raekke.kortnavn}
            onChange={(e) => saet("kortnavn", e.target.value)}
          />
        </label>

        <label className="block">
          <span className={ETIKET}>Undertitel (dansk)</span>
          <input
            className={`${FELT} mt-1.5`}
            value={raekke.undertitel_da}
            onChange={(e) => saet("undertitel_da", e.target.value)}
          />
        </label>

        <label className="block">
          <span className={ETIKET}>Undertitel (engelsk)</span>
          <input
            className={`${FELT} mt-1.5`}
            value={raekke.undertitel_en}
            onChange={(e) => saet("undertitel_en", e.target.value)}
          />
        </label>

        <label className="block">
          <span className={ETIKET}>Farve (header)</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              aria-label="Vælg headerfarve"
              className="h-9 w-12 shrink-0 rounded border border-slate-300"
              value={raekke.farvekode}
              onChange={(e) => saet("farvekode", e.target.value.toUpperCase())}
            />
            <input
              className={FELT}
              value={raekke.farvekode}
              onChange={(e) => saet("farvekode", e.target.value.toUpperCase())}
            />
          </div>
        </label>

        <label className="block">
          <span className={ETIKET}>Lys farve (mærkater)</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              aria-label="Vælg lys farve"
              className="h-9 w-12 shrink-0 rounded border border-slate-300"
              value={raekke.lys_farvekode}
              onChange={(e) => saet("lys_farvekode", e.target.value.toUpperCase())}
            />
            <input
              className={FELT}
              value={raekke.lys_farvekode}
              onChange={(e) => saet("lys_farvekode", e.target.value.toUpperCase())}
            />
          </div>
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Tekstfarven på headeren vælges automatisk ud fra baggrundens lysstyrke, så overskriften
        altid kan læses.
      </p>

      <h3 className="mt-7 text-base font-bold text-slate-950">
        Blokke <span className="font-normal text-slate-500">({raekke.blokke.length})</span>
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Hver blok bliver en kolonne på skærmen. Et linjeskift i teksten bliver en linje på
        skærmen.
      </p>

      <div className="mt-4 space-y-4">
        {raekke.blokke.map((blok, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Blok {i + 1}
              </p>
              <button
                type="button"
                onClick={() => fjernBlok(i)}
                className="rounded-lg px-2.5 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                Fjern
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={ETIKET}>Titel (dansk)</span>
                <input
                  className={`${FELT} mt-1.5`}
                  value={blok.titel_da}
                  onChange={(e) => saetBlok(i, "titel_da", e.target.value)}
                />
              </label>

              <label className="block">
                <span className={ETIKET}>Titel (engelsk)</span>
                <input
                  className={`${FELT} mt-1.5`}
                  value={blok.titel_en}
                  onChange={(e) => saetBlok(i, "titel_en", e.target.value)}
                />
              </label>

              <label className="block">
                <span className={ETIKET}>Tekst (dansk)</span>
                <textarea
                  rows={4}
                  className={`${FELT} mt-1.5`}
                  value={blok.tekst_da}
                  onChange={(e) => saetBlok(i, "tekst_da", e.target.value)}
                />
              </label>

              <label className="block">
                <span className={ETIKET}>Tekst (engelsk)</span>
                <textarea
                  rows={4}
                  className={`${FELT} mt-1.5`}
                  value={blok.tekst_en}
                  onChange={(e) => saetBlok(i, "tekst_en", e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={tilfoejBlok}
        className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        Tilføj blok
      </button>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={gem}
          disabled={isPending}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          {isPending ? "Gemmer…" : `Gem ${raekke.farve}`}
        </button>

        <span aria-live="polite" className="text-sm text-slate-600">
          {gemt ? "Gemt ✓" : ""}
        </span>
      </div>

      {fejl && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {fejl}
        </p>
      )}
    </section>
  );
}
