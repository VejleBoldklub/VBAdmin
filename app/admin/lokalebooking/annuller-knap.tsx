"use client";

import { useRef, useState, useTransition } from "react";
import { annullerBooking, annullerSerie } from "@/features/lokalebooking/admin-handlinger";
import type { SerieVisning } from "@/features/lokalebooking/types";

// Annullér-knap med bekræftelse.
//
// Bruger <dialog> frem for en selvbygget overlay. Browseren giver så
// tastaturfælden, Escape og baggrundsspærringen gratis, og det er præcis den
// slags, der bliver glemt i en håndlavet udgave.
//
// Bekræftelsen viser lokale, dag og tidsrum. En liste med mange bookinger ligner
// sig selv, og et fejlklik skal ikke kunne aflyse en anden aftale end den, man
// troede — derfor gentages hvilken booking der er tale om, frem for bare at
// spørge "er du sikker?".
//
// Hører bookingen til en serie, er der to handlinger bag den samme knap: aflys
// kun denne dato, eller aflys hele rækken. Valget står som to udtrykkelige
// muligheder, og der er ingen forvalgt genvej til den store: den, der rammer tolv
// bookinger, skal vælges aktivt. Af samme grund skifter både overskriften og
// teksten på bekræftelsesknappen med valget — knappen skal sige, hvad der sker,
// ikke bare "OK".

type AnnullerKnapProps = {
  id: string;
  lokaleNavn: string;
  dag: string;
  klokke: string;
  // Sat, hvis bookingen er én forekomst i en gentagen serie.
  serie?: SerieVisning;
  // Kompakt udgave til tabellen, hvor knappen skal fylde lidt.
  kompakt?: boolean;
};

type Omfang = "denne" | "serien";

export default function AnnullerKnap({
  id,
  lokaleNavn,
  dag,
  klokke,
  serie,
  kompakt = false,
}: AnnullerKnapProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [venter, startOvergang] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [omfang, setOmfang] = useState<Omfang>("denne");

  const aabn = () => {
    setFejl(null);
    // Valget nulstilles hver gang. Ellers ville et "hele serien" fra sidste gang
    // stå og vente på næste klik — på en anden booking.
    setOmfang("denne");
    dialog.current?.showModal();
  };

  const luk = () => {
    if (!venter) dialog.current?.close();
  };

  const rammerSerien = serie !== undefined && omfang === "serien";

  const annuller = () =>
    startOvergang(async () => {
      const svar = rammerSerien ? await annullerSerie(serie.id) : await annullerBooking(id);

      if (!svar.ok) {
        setFejl(svar.fejl);
        return;
      }

      // Ved held lukkes dialogen, og siden gengives igen. Bookingerne står nu som
      // aflyst, og knappen forsvinder af sig selv.
      dialog.current?.close();
    });

  const valgmulighed = (vaerdi: Omfang, titel: string, forklaring: string) => (
    <label
      key={vaerdi}
      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 ${
        omfang === vaerdi ? "border-red-700 bg-red-50" : "border-slate-300 bg-white"
      }`}
    >
      <input
        type="radio"
        name={`omfang-${id}`}
        value={vaerdi}
        checked={omfang === vaerdi}
        onChange={() => setOmfang(vaerdi)}
        disabled={venter}
        className="mt-0.5 h-4 w-4 accent-red-700"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-950">{titel}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-600">{forklaring}</span>
      </span>
    </label>
  );

  return (
    <>
      <button
        type="button"
        onClick={aabn}
        className={`whitespace-nowrap rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 ${
          kompakt ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        Annullér{serie ? " …" : ""}
      </button>

      <dialog
        ref={dialog}
        // Klik uden for indholdet lukker. Uden dette skal man ramme en knap, og
        // en dialog, der ikke kan lukkes med musen, føles som en fælde.
        onClick={(e) => {
          if (e.target === dialog.current) luk();
        }}
        onCancel={(e) => {
          // Escape under en igangværende annullering ville lukke vinduet, mens
          // handlingen kører, og efterlade brugeren i tvivl om, hvad der skete.
          if (venter) e.preventDefault();
        }}
        // Samme centrering som bookingmodalen, og af samme grund: browserens
        // egen `margin: auto` på en <dialog> bliver slået ihjel af Tailwinds
        // reset, og uden disse klasser lander vinduet i øverste venstre hjørne.
        className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-950/40"
      >
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            {serie
              ? "Denne booking er del af en serie"
              : "Er du sikker på du vil annullere denne booking?"}
          </h2>

          <dl className="mt-4 grid gap-x-5 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-slate-500">Lokale</dt>
            <dd className="font-medium text-slate-900">{lokaleNavn}</dd>

            <dt className="text-slate-500">Dato</dt>
            <dd className="font-medium text-slate-900">{dag}</dd>

            <dt className="text-slate-500">Tidsrum</dt>
            <dd className="font-medium tabular-nums text-slate-900">{klokke}</dd>

            {serie && (
              <>
                <dt className="text-slate-500">Serie</dt>
                <dd className="font-medium text-slate-900">
                  Serie {serie.maerke} · {serie.foersteDag} – {serie.sidsteDag}
                </dd>
              </>
            )}
          </dl>

          {serie ? (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-slate-800">
                Hvad skal annulleres?
              </legend>
              <div className="mt-2 grid gap-2">
                {valgmulighed(
                  "denne",
                  "Kun denne dato",
                  `Resten af serien bliver stående. ${
                    serie.aktive - 1 === 1
                      ? "1 booking i serien fortsætter."
                      : `${Math.max(serie.aktive - 1, 0)} bookinger i serien fortsætter.`
                  }`
                )}
                {valgmulighed(
                  "serien",
                  `Hele serien — ${serie.aktive} ${
                    serie.aktive === 1 ? "booking" : "bookinger"
                  }`,
                  "Alle datoer i rækken, der stadig gælder, annulleres på én gang. Allerede aflyste datoer røres ikke."
                )}
              </div>
            </fieldset>
          ) : null}

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {rammerSerien
              ? "Alle tidsrummene bliver ledige igen, og bookeren får én samlet mail om, at klubben har annulleret rækken."
              : "Tidsrummet bliver ledigt igen, og bookeren får en mail om, at klubben har annulleret bookingen."}
          </p>

          {fejl && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
            >
              {fejl}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={annuller}
              disabled={venter}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {venter
                ? "Annullerer …"
                : rammerSerien
                  ? `Ja, annullér alle ${serie.aktive}`
                  : serie
                    ? "Ja, annullér denne dato"
                    : "Ja, annullér bookingen"}
            </button>
            <button
              type="button"
              onClick={luk}
              disabled={venter}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {serie ? "Behold alle" : "Behold bookingen"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
