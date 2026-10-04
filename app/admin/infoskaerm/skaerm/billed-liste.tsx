"use client";

import { useState, useTransition } from "react";
import type { AdminBillede } from "@/lib/infoskaerm/billeder";
import { gemRaekkefoelge, opdaterBillede, sletBillede } from "./actions";

const FELT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

const LILLE_KNAP =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

function datoTekst(dato: string): string {
  return new Date(dato + "T12:00:00Z").toLocaleDateString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function BilledListe({ start }: { start: AdminBillede[] }) {
  const [billeder, setBilleder] = useState(start);
  const [fejl, setFejl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (billeder.length === 0) {
    return <p className="mt-5 text-sm text-slate-500">Der er ingen billeder endnu.</p>;
  }

  // Listen flyttes med det samme på siden og gemmes bagefter. Fejler det, sættes
  // den tilbage, så siden ikke viser en rækkefølge, skærmen ikke har.
  function flyt(i: number, retning: -1 | 1) {
    const j = i + retning;
    if (j < 0 || j >= billeder.length) return;

    const foer = billeder;
    const efter = [...billeder];
    [efter[i], efter[j]] = [efter[j], efter[i]];
    setBilleder(efter);

    startTransition(async () => {
      try {
        const svar = await gemRaekkefoelge(efter.map((b) => b.id));
        if (svar.ok) {
          setFejl(null);
        } else {
          setFejl(svar.fejl);
          setBilleder(foer);
        }
      } catch (err) {
        console.error("Kald til gemRaekkefoelge fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setBilleder(foer);
      }
    });
  }

  return (
    <>
      {fejl && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
          {fejl}
        </p>
      )}

      <ul className="mt-5 space-y-4">
        {billeder.map((b, i) => (
          <li key={b.id}>
            <BilledKort
              billede={b}
              foerste={i === 0}
              sidste={i === billeder.length - 1}
              flytter={isPending}
              onOp={() => flyt(i, -1)}
              onNed={() => flyt(i, 1)}
              onSlettet={() => setBilleder((liste) => liste.filter((x) => x.id !== b.id))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function BilledKort({
  billede,
  foerste,
  sidste,
  flytter,
  onOp,
  onNed,
  onSlettet,
}: {
  billede: AdminBillede;
  foerste: boolean;
  sidste: boolean;
  flytter: boolean;
  onOp: () => void;
  onNed: () => void;
  onSlettet: () => void;
}) {
  const [tekst, setTekst] = useState(billede.tekst);
  const [visDato, setVisDato] = useState(billede.visDato ?? "");
  const [aktiv, setAktiv] = useState(billede.aktiv);
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);
  const [isPending, startTransition] = useTransition();

  function gem(naesteAktiv = aktiv) {
    startTransition(async () => {
      try {
        const svar = await opdaterBillede(billede.id, { tekst, visDato, aktiv: naesteAktiv });
        if (svar.ok) {
          setFejl(null);
          setGemt(true);
        } else {
          setFejl(svar.fejl);
          setGemt(false);
        }
      } catch (err) {
        console.error("Kald til opdaterBillede fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setGemt(false);
      }
    });
  }

  function slet() {
    if (!window.confirm("Slet billedet? Det kan ikke fortrydes.")) return;

    startTransition(async () => {
      try {
        const svar = await sletBillede(billede.id);
        if (svar.ok) {
          onSlettet();
        } else {
          setFejl(svar.fejl);
        }
      } catch (err) {
        console.error("Kald til sletBillede fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
      }
    });
  }

  // En dato, der er passeret, vises aldrig igen. Det skal kunne ses her, ellers
  // ligner billedet et, der stadig er på skærmen.
  const idag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(
    new Date()
  );
  const udloebet = billede.visDato !== null && billede.visDato < idag;

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row ${
        aktiv && !udloebet ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"
      }`}
    >
      {/* Et almindeligt img-element: filen er allerede skaleret ned ved upload,
          og Next' billedoptimering ville kun lægge en ekstra omvej ind. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={billede.url}
        alt={billede.tekst || "Billede til infoskærmen"}
        className={`h-40 w-full shrink-0 rounded-lg object-cover sm:w-56 ${
          aktiv && !udloebet ? "" : "opacity-50"
        }`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]">
          {!aktiv ? (
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-600">Skjult</span>
          ) : udloebet ? (
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-600">
              Dato passeret
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800">
              {billede.visDato ? `Vises ${datoTekst(billede.visDato)}` : "Vises hver dag"}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className={ETIKET}>Tekst under billedet</span>
            <input
              className={`${FELT} mt-1.5`}
              value={tekst}
              maxLength={200}
              onChange={(e) => {
                setTekst(e.target.value);
                setGemt(false);
              }}
            />
          </label>
          <label className="block">
            <span className={ETIKET}>Kun denne dag</span>
            <input
              type="date"
              className={`${FELT} mt-1.5`}
              value={visDato}
              onChange={(e) => {
                setVisDato(e.target.value);
                setGemt(false);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => gem()}
            disabled={isPending}
            className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            Gem
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const naeste = !aktiv;
              setAktiv(naeste);
              gem(naeste);
            }}
            className={LILLE_KNAP}
          >
            {aktiv ? "Skjul" : "Vis igen"}
          </button>
          <button
            type="button"
            onClick={onOp}
            disabled={foerste || flytter}
            aria-label="Flyt op"
            className={LILLE_KNAP}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onNed}
            disabled={sidste || flytter}
            aria-label="Flyt ned"
            className={LILLE_KNAP}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={slet}
            disabled={isPending}
            className="ml-auto rounded-lg px-2.5 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Slet
          </button>
          <span aria-live="polite" className="text-sm text-slate-600">
            {isPending ? "Gemmer…" : gemt ? "Gemt ✓" : ""}
          </span>
        </div>

        {fejl && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {fejl}
          </p>
        )}
      </div>
    </div>
  );
}
