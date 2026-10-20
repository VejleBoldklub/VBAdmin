"use client";

import { useState, useTransition } from "react";
import {
  SEKUNDER_MAKS,
  SEKUNDER_MIN,
  type Layout,
  type Opsaetning,
} from "@/lib/infoskaerm/billeder";
import { gemOpsaetning } from "./actions";

const VALG: { value: Layout; titel: string; tekst: string }[] = [
  {
    value: "kost",
    titel: "Kun kostplan",
    tekst: "Skærmen viser dagens kostplan, som den altid har gjort. Billederne vises ikke.",
  },
  {
    value: "billeder",
    titel: "Kun billeder",
    tekst:
      "Skærmen viser kun billederne, i fuld skærm, ét ad gangen. Når det sidste har været vist, starter den forfra.",
  },
  {
    value: "side",
    titel: "Kostplan med billeder",
    tekst: "Kostplanen fylder det meste, og billederne skifter i en kolonne ved siden af.",
  },
  {
    value: "skift",
    titel: "Skift mellem kostplan og billeder",
    tekst:
      "Først kostplanen, så hvert billede i fuld skærm efter tur, og så kostplanen igen.",
  },
];

export default function OpsaetningForm({
  start,
  antalIDag,
}: {
  start: Opsaetning;
  // Billeder, der er slået til og vises i dag: uden dato eller med dagens dato.
  antalIDag: number;
}) {
  const [layout, setLayout] = useState<Layout>(start.layout);
  const [sekunder, setSekunder] = useState(String(start.sekunder));
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);
  const [isPending, startTransition] = useTransition();

  function gem() {
    startTransition(async () => {
      try {
        const svar = await gemOpsaetning(layout, Number(sekunder));

        if (svar.ok) {
          setFejl(null);
          setGemt(true);
        } else {
          setFejl(svar.fejl);
          setGemt(false);
        }
      } catch (err) {
        console.error("Kald til gemOpsaetning fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setGemt(false);
      }
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">Opsætning</h2>

      <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Hvordan skærmen er sat op</legend>
        {VALG.map((v) => {
          const valgt = layout === v.value;
          return (
            <label
              key={v.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-sm transition focus-within:ring-2 focus-within:ring-red-700 ${
                valgt ? "border-red-700 bg-red-50" : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-slate-950">
                <input
                  type="radio"
                  name="layout"
                  value={v.value}
                  checked={valgt}
                  onChange={() => {
                    setLayout(v.value);
                    setGemt(false);
                  }}
                  className="accent-red-700"
                />
                {v.titel}
              </span>
              <span className="text-slate-600">{v.tekst}</span>
            </label>
          );
        })}
      </fieldset>

      <label className="mt-5 block max-w-xs">
        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Sekunder pr. billede
        </span>
        <input
          type="number"
          min={SEKUNDER_MIN}
          max={SEKUNDER_MAKS}
          step={1}
          value={sekunder}
          onChange={(e) => {
            setSekunder(e.target.value);
            setGemt(false);
          }}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Hvert billede står så længe, før det næste kommer. Ved skift står kostplanen også så
          længe.
        </span>
      </label>

      {layout !== "kost" && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {antalIDag === 0
            ? "Der er ingen billeder at vise i dag, så skærmen viser kostplanen. Læg billeder op nedenfor."
            : `I dag skifter skærmen mellem ${antalIDag} ${antalIDag === 1 ? "billede" : "billeder"}. ` +
              `Alle billeder, der er slået til og ikke har en anden dato, kommer med.`}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={gem}
          disabled={isPending}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          {isPending ? "Gemmer…" : "Gem opsætning"}
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
