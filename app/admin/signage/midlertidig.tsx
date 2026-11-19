"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CAFETERIA_SLUG,
  ELEMENT_NAVNE,
  MIDLERTIDIG_ENHEDER,
  type MidlertidigEnhed,
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
  const [maade, setMaade] = useState<"varighed" | "indtil">("varighed");
  const [antal, setAntal] = useState("");
  const [enhed, setEnhed] = useState<MidlertidigEnhed>("min");
  const [indtil, setIndtil] = useState("");
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

  // Sluttidspunktet regnes ud i browseren, så "indtil" følger Asgers egen
  // (danske) tid. Serveren tjekker bagefter, at det ligger i fremtiden.
  function sluttid(): string | null {
    if (maade === "indtil") {
      const ms = indtil ? new Date(indtil).getTime() : NaN;
      return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    const n = Number(antal.replace(",", "."));
    const faktor = MIDLERTIDIG_ENHEDER.find((e) => e.kode === enhed)?.minutter ?? 1;
    if (!(n > 0)) return null;
    return new Date(tidspunkt() + Math.round(n * faktor * 60_000)).toISOString();
  }

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
            const til = sluttid();
            if (!til) {
              setFejl(maade === "indtil" ? "Vælg dato og klokkeslæt." : "Skriv et antal større end 0.");
              return;
            }
            koer(() => startMidlertidig(skaerm.id, elementId, til));
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
          <div className="grid gap-2">
            <div className="flex gap-2 text-sm" role="radiogroup" aria-label="Hvordan sættes tiden">
              <button
                type="button"
                role="radio"
                aria-checked={maade === "varighed"}
                className={`${KNAP} ${maade === "varighed" ? "border-red-500" : ""}`}
                onClick={() => setMaade("varighed")}
              >
                I et tidsrum
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={maade === "indtil"}
                className={`${KNAP} ${maade === "indtil" ? "border-red-500" : ""}`}
                onClick={() => setMaade("indtil")}
              >
                Indtil dato og klokkeslæt
              </button>
            </div>

            {maade === "varighed" ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step="any"
                    inputMode="decimal"
                    value={antal}
                    onChange={(e) => setAntal(e.target.value)}
                    aria-label="Antal"
                    placeholder="Antal"
                    className={`${FELT} w-28`}
                  />
                  <select
                    value={enhed}
                    onChange={(e) => setEnhed(e.target.value as MidlertidigEnhed)}
                    aria-label="Enhed"
                    className={FELT}
                  >
                    {MIDLERTIDIG_ENHEDER.map((e) => (
                      <option key={e.kode} value={e.kode}>
                        {e.navn}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <input
                type="datetime-local"
                value={indtil}
                onChange={(e) => setIndtil(e.target.value)}
                aria-label="Vis indtil"
                className={FELT}
              />
            )}
          </div>
          <button
            type="submit"
            disabled={isPending || !elementId}
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
