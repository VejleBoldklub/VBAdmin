"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CAFETERIA_SLUG,
  ELEMENT_NAVNE,
  MIDLERTIDIG_VALG,
  type Element,
  type Skaerm,
} from "@/lib/signage/typer";
import { ETIKET, FELT, KNAP, KNAP_ROED, KORT } from "./ui";
import { startMidlertidig, stopMidlertidig } from "./actions";

// Midlertidig visning: vis ét element alene på skærmen i et valgt tidsrum,
// fx til en test. Bagefter kører playlisten igen af sig selv.

function tidspunkt(): number {
  return Date.now();
}

function slutTekst(til: string): string {
  return new Date(til).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function navnPaa(e: Element): string {
  return `${e.titel || ELEMENT_NAVNE[e.type]}${e.aktiv ? "" : " (slået fra i playlisten)"}`;
}

export default function Midlertidig({ skaerm, elementer }: { skaerm: Skaerm; elementer: Element[] }) {
  const router = useRouter();
  const valgbare = elementer.filter((e) => !(skaerm.slug === CAFETERIA_SLUG && e.type === "infoskaerm"));
  const [elementId, setElementId] = useState(valgbare[0]?.id ?? "");
  const [minutter, setMinutter] = useState(MIDLERTIDIG_VALG[0].minutter);
  const [egneMin, setEgneMin] = useState("");
  const [fejl, setFejl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [nu] = useState(tidspunkt);

  const kører = skaerm.midlertidigElementId && skaerm.midlertidigTil && Date.parse(skaerm.midlertidigTil) > nu;
  const korerElement = kører ? elementer.find((e) => e.id === skaerm.midlertidigElementId) : undefined;

  function koer(fn: () => Promise<{ ok: true } | { ok: false; fejl: string }>) {
    setFejl(null);
    startTransition(async () => {
      try {
        const svar = await fn();
        if (svar.ok) router.refresh();
        else setFejl(svar.fejl);
      } catch (err) {
        console.error("Midlertidig visning fejlede:", err);
        setFejl("Serveren svarede ikke. Prøv igen.");
      }
    });
  }

  const valgtMin = minutter === -1 ? Number(egneMin) : minutter;

  return (
    <section id="midlertidig" className={KORT} aria-label="Midlertidig visning">
      <p className={ETIKET}>Midlertidig visning</p>
      <p className="mt-1 text-sm text-slate-400">
        Vis ét element alene på skærmen i et tidsrum, fx til en test. Bagefter kører playlisten igen af sig selv.
        {skaerm.slug === CAFETERIA_SLUG && " Gælder også Infoskærm Cafeteria (inden for to minutter)."}
      </p>

      {kører && (
        <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-bold">Kører nu: {korerElement ? navnPaa(korerElement) : "et element"}</p>
          <p className="mt-0.5">Til {slutTekst(skaerm.midlertidigTil!)}</p>
          <button
            type="button"
            disabled={isPending}
            className={`${KNAP} mt-3`}
            onClick={() => koer(() => stopMidlertidig(skaerm.id))}
          >
            {isPending ? "Stopper…" : "Stop nu"}
          </button>
        </div>
      )}

      {valgbare.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Læg først et element i playlisten. Det må gerne være slået fra.</p>
      ) : (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            koer(() => startMidlertidig(skaerm.id, elementId, valgtMin));
          }}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-200">
            Vis
            <select value={elementId} onChange={(e) => setElementId(e.target.value)} className={FELT}>
              {valgbare.map((e) => (
                <option key={e.id} value={e.id}>
                  {navnPaa(e)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-200">
            I
            <select value={minutter} onChange={(e) => setMinutter(Number(e.target.value))} className={FELT}>
              {MIDLERTIDIG_VALG.map((v) => (
                <option key={v.minutter} value={v.minutter}>
                  {v.navn}
                </option>
              ))}
              <option value={-1}>Andet antal minutter…</option>
            </select>
          </label>
          {minutter === -1 && (
            <input
              type="number"
              min={1}
              max={44640}
              value={egneMin}
              onChange={(e) => setEgneMin(e.target.value)}
              placeholder="Minutter, fx 45"
              aria-label="Antal minutter"
              className={FELT}
            />
          )}
          <button
            type="submit"
            disabled={isPending || !elementId || !(valgtMin > 0)}
            className={KNAP_ROED}
          >
            {isPending ? "Starter…" : kører ? "Erstat og start" : "Start midlertidig visning"}
          </button>
        </form>
      )}

      {fejl && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-300">
          {fejl}
        </p>
      )}
    </section>
  );
}
