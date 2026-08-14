"use client";

import { useState, useTransition } from "react";
import type { DagFarve } from "@/lib/infoskaerm/content";
import { gemDag } from "./actions";

const FARVER: { value: DagFarve; label: string; kort: string; dot: string }[] = [
  { value: "Rød", label: "Rød · Performance", kort: "Rød", dot: "#B91C1C" },
  { value: "Gul", label: "Gul · Recovery", kort: "Gul", dot: "#D6A800" },
  { value: "Grøn", label: "Grøn · Health", kort: "Grøn", dot: "#2E8B2E" },
];

const KNAP =
  "rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2";

export default function DayRow({
  dato,
  labelDato,
  initialFarve,
  initialBesked,
}: {
  dato: string;
  labelDato: string;
  initialFarve: DagFarve;
  initialBesked: string;
}) {
  const [farve, setFarve] = useState<DagFarve>(initialFarve);
  const [besked, setBesked] = useState(initialBesked);
  const [gemt, setGemt] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handlingen returnerer sit udfald frem for at kaste. En fejl skal kunne ses
  // af den, der lige har trykket: uden dette ville et afvist kald se ud som om
  // ændringen var gemt, indtil siden blev genindlæst.
  function save(nextFarve: DagFarve, nextBesked: string) {
    startTransition(async () => {
      const svar = await gemDag(dato, nextFarve, nextBesked);

      if (svar.ok) {
        setFejl(null);
        setGemt(true);
      } else {
        setFejl(svar.fejl);
        setGemt(false);
      }
    });
  }

  return (
    <div className="border-b border-slate-200 px-4 py-3 last:border-b-0 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="font-semibold text-slate-700 sm:w-28 sm:shrink-0">{labelDato}</div>

        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {FARVER.map((f) => {
            const valgt = farve === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={valgt}
                onClick={() => {
                  setFarve(f.value);
                  save(f.value, besked);
                }}
                className={`${KNAP} ${valgt ? "text-white" : "bg-white text-slate-700"}`}
                style={{ background: valgt ? f.dot : undefined, borderColor: f.dot }}
              >
                <span className="sm:hidden">{f.kort}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={besked}
          aria-label={`Besked på skærmen ${labelDato}`}
          placeholder="Besked til skærmen den dag (valgfri)"
          onChange={(e) => {
            setBesked(e.target.value);
            setGemt(false);
          }}
          onBlur={() => save(farve, besked)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        />

        {/* aria-live, så en skærmlæser også får besked om at der blev gemt. */}
        <div
          aria-live="polite"
          className="text-xs text-slate-500 sm:w-16 sm:shrink-0 sm:text-right"
        >
          {isPending ? "Gemmer…" : gemt ? "Gemt ✓" : ""}
        </div>
      </div>

      {fejl && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {fejl}
        </p>
      )}
    </div>
  );
}
