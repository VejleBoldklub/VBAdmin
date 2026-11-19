"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dagtype } from "@/lib/infoskaerm/data";
import type { Resultat } from "@/lib/signage/typer";
import { ETIKET, FELT, KNAP, KNAP_ROED, KORT } from "../ui";
import { omdoebDagtype, opretDagtype, sletDagtype } from "./actions";

type Type = Dagtype & { fast: boolean };

export default function Dagtyper({ typer }: { typer: Type[] }) {
  const router = useRouter();
  const [navn, setNavn] = useState("");
  const [kilde, setKilde] = useState(typer[0]?.farve ?? "Rød");
  const [fejl, setFejl] = useState<string | null>(null);
  const [besked, setBesked] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function koer(handling: () => Promise<Resultat>, ok: string) {
    setFejl(null);
    setBesked(null);
    startTransition(async () => {
      try {
        const svar = await handling();
        if (svar.ok) {
          setBesked(ok);
          router.refresh();
        } else {
          setFejl(svar.fejl);
        }
      } catch (err) {
        console.error("Dagtype-handling fejlede:", err);
        setFejl("Serveren svarede ikke. Prøv igen.");
      }
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className={KORT}>
        <p className={ETIKET}>Dagtyper</p>
        <ul className="mt-4 divide-y divide-[#1e2a44]">
          {typer.map((t) => (
            <Raekke key={t.farve} type={t} travl={isPending} koer={koer} />
          ))}
        </ul>
      </div>

      <form
        className={`${KORT} h-fit`}
        onSubmit={(e) => {
          e.preventDefault();
          const n = navn.trim();
          koer(() => opretDagtype(n, kilde), `"${n}" er oprettet.`);
          setNavn("");
        }}
      >
        <p className={ETIKET}>Ny dagtype</p>
        <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="ny-navn">
          Navn
        </label>
        <input
          id="ny-navn"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          maxLength={30}
          placeholder="Fx Rød 2"
          className={`${FELT} mt-1`}
        />
        <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="ny-kilde">
          Kopiér kostindhold og design fra
        </label>
        <select id="ny-kilde" value={kilde} onChange={(e) => setKilde(e.target.value)} className={`${FELT} mt-1`}>
          {typer.map((t) => (
            <option key={t.farve} value={t.farve}>
              {t.farve}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending || navn.trim() === ""} className={`${KNAP_ROED} mt-5 w-full`}>
          {isPending ? "Gemmer…" : "Opret dagtype"}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          Et kopieret design starter slukket, så du kan rette det til under Design pr. farve, før det vises.
        </p>
      </form>

      <div aria-live="polite" className="lg:col-span-2">
        {fejl && <p role="alert" className="text-sm font-semibold text-red-300">{fejl}</p>}
        {besked && <p className="text-sm font-semibold text-emerald-300">{besked}</p>}
      </div>
    </div>
  );
}

function Raekke({
  type,
  travl,
  koer,
}: {
  type: Type;
  travl: boolean;
  koer: (handling: () => Promise<Resultat>, ok: string) => void;
}) {
  const [redigerer, setRedigerer] = useState(false);
  const [nytNavn, setNytNavn] = useState(type.farve);
  const [bekraeft, setBekraeft] = useState(false);
  const q = encodeURIComponent(type.farve);

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: type.farvekode }} />
      {redigerer ? (
        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            koer(() => omdoebDagtype(type.farve, nytNavn), `Omdøbt til "${nytNavn.trim()}".`);
            setRedigerer(false);
          }}
        >
          <input
            value={nytNavn}
            onChange={(e) => setNytNavn(e.target.value)}
            maxLength={30}
            aria-label={`Nyt navn for ${type.farve}`}
            className={`${FELT} max-w-xs flex-1`}
          />
          <button type="submit" disabled={travl} className={KNAP_ROED}>
            Gem
          </button>
          <button type="button" className={KNAP} onClick={() => setRedigerer(false)}>
            Annullér
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">{type.farve}</p>
            <p className="text-xs text-slate-400">
              {type.kortnavn}
              {type.fast ? " · fast" : ""}
            </p>
          </div>
          <Link href={`/admin/infoskaerm/indhold#${q}`} className={KNAP}>
            Kostindhold
          </Link>
          <Link href={`/admin/infoskaerm/design?farve=${q}`} className={KNAP}>
            Design
          </Link>
          {!type.fast &&
            (bekraeft ? (
              <>
                <button
                  type="button"
                  disabled={travl}
                  className={KNAP_ROED}
                  onClick={() => {
                    setBekraeft(false);
                    koer(() => sletDagtype(type.farve), `"${type.farve}" er slettet.`);
                  }}
                >
                  Ja, slet
                </button>
                <button type="button" className={KNAP} onClick={() => setBekraeft(false)}>
                  Nej
                </button>
              </>
            ) : (
              <>
                <button type="button" className={KNAP} onClick={() => setRedigerer(true)}>
                  Omdøb
                </button>
                <button type="button" className={KNAP} onClick={() => setBekraeft(true)}>
                  Slet
                </button>
              </>
            ))}
        </>
      )}
    </li>
  );
}
