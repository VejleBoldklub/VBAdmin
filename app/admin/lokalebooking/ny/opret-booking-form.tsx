"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  SPRING_OVER_FELT,
  TOM_ADMIN_INDTASTNING,
  type AdminIndtastning,
  type AdminOpretResultat,
} from "@/features/lokalebooking/admin-formular";
import {
  kvartererPaaDag,
  LUKKER,
  minutterTilKlokke,
  slutKvarterer,
} from "@/features/lokalebooking/regler";
import {
  datoTekst,
  erGentagelse,
  GENTAGELSER,
  GENTAGELSE_TEKST,
  MAKS_FOREKOMSTER,
  serieDatoer,
  type Afslutning,
} from "@/features/lokalebooking/serie";
import { isoDagFor } from "@/features/lokalebooking/uge";

// Adminfladens oprettelsesformular, med mulighed for at gentage bookingen.
//
// Formularen holder selv styr på felterne, ligesom den offentlige. Forskellen er
// gentagelses-sektionen og konfliktdialogen, som ikke findes andre steder:
//
//   Forhåndsvisningen af datoerne regnes HER i browseren med den samme funktion,
//   serveren bruger. Det er med vilje: admin skal kunne se, hvad et mønster giver,
//   før der trykkes, og et kald til serveren for hvert tastetryk ville hverken
//   være hurtigere eller mere rigtigt. Serveren regner den samme liste igen og
//   stoler ikke på browserens — den er en visning, ikke et input.
//
//   Konfliktdialogen er ikke et vindue. Den er en del af formularen, og knappen
//   "opret de øvrige" er en almindelig submit-knap med et navn og en værdi. Så
//   følger valget med selve indsendelsen og kan ikke komme ud af trit med de
//   felter, der bliver sendt sammen med det.

type LokaleValg = { slug: string; navn: string };

type OpretBookingFormProps = {
  lokaler: LokaleValg[];
  // Dagens dato i dansk tid. Nedre grænse på datofelterne.
  iDag: string;
  // Minutter siden midnat, da siden blev gengivet. Holder passerede kvarterer ude
  // af dagens valgmuligheder.
  nuMinutter: number;
  maksDato: string;
  handling: (forrige: AdminOpretResultat, fd: FormData) => Promise<AdminOpretResultat>;
};

const FELT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700 disabled:bg-slate-50 disabled:text-slate-400";
const MAERKAT = "block text-sm font-semibold text-slate-800";
const VALGFRI = "ml-1.5 text-xs font-normal text-slate-500";

// Hvor mange datoer der vises i forhåndsvisningen, før listen klippes. Et halvt
// års ugentlige bookinger er over tyve linjer, og formularen skal stadig kunne
// overskues.
const VIS_HOEJST = 10;

export default function OpretBookingForm({
  lokaler,
  iDag,
  nuMinutter,
  maksDato,
  handling,
}: OpretBookingFormProps) {
  const [resultat, formAction, venter] = useActionState<AdminOpretResultat, FormData>(handling, {
    tilstand: "uroert",
  });

  // Samme mønster som den offentlige formular: kun det, brugeren selv har rørt,
  // ligger i tilstand. Er der ikke rørt noget, udledes felterne af serverens svar,
  // så formularen også kan fyldes ud igen, hvis den blev sendt før hydrering.
  const [redigeret, setRedigeret] = useState<AdminIndtastning | null>(null);

  // useActionState har ingen nulstilling. Et svar, brugeren har lukket, gemmes
  // væk frem for at blive kastet bort — et NYT svar vises igen af sig selv, fordi
  // det er et andet objekt end det lukkede.
  const [lukketSvar, setLukketSvar] = useState<AdminOpretResultat | null>(null);

  const fraSvar =
    resultat.tilstand === "fejl" || resultat.tilstand === "konflikt" ? resultat.vaerdier : null;

  const indtastning: AdminIndtastning = redigeret ?? fraSvar ?? TOM_ADMIN_INDTASTNING;

  const visning: AdminOpretResultat =
    resultat === lukketSvar ? { tilstand: "uroert" } : resultat;

  const opdater = (aendring: Partial<AdminIndtastning>) => {
    // En konfliktliste hører til de datoer, den blev regnet på. Ændres et felt,
    // passer den ikke længere, og den skal væk frem for at stå og se gyldig ud.
    if (resultat.tilstand === "konflikt") setLukketSvar(resultat);
    setRedigeret({ ...indtastning, ...aendring });
  };

  const saetFelt = (felt: keyof AdminIndtastning, vaerdi: string) => opdater({ [felt]: vaerdi });

  function startMulighederFor(dato: string): number[] {
    if (dato === "") return [];
    const alle = kvartererPaaDag(isoDagFor(dato));
    return dato === iDag ? alle.filter((m) => m > nuMinutter) : alle;
  }

  // En ny dato kan gøre det valgte starttidspunkt ulovligt: kl. 09.00 findes i
  // weekenden, men ikke på en hverdag. Starten flyttes til dagens første mulige
  // kvarter frem for at stå med en værdi, serveren vil afvise.
  const saetDato = (dato: string) => {
    const muligheder = startMulighederFor(dato);

    if (dato === "" || muligheder.length === 0) {
      opdater({ dato, start: "", slut: "" });
      return;
    }

    const oensket = Number(indtastning.start);
    const start = muligheder.includes(oensket) ? oensket : muligheder[0];

    opdater({
      dato,
      start: String(start),
      slut: String(Math.min(start + 60, LUKKER)),
    });
  };

  const saetStart = (start: string) => {
    if (start === "") {
      opdater({ start: "", slut: "" });
      return;
    }
    opdater({ start, slut: String(Math.min(Number(start) + 60, LUKKER)) });
  };

  const startMuligheder = startMulighederFor(indtastning.dato);
  const slutMuligheder =
    indtastning.start === "" ? [] : slutKvarterer(Number(indtastning.start));

  // Forhåndsvisningen. Regnes kun, når der faktisk er et mønster og en gyldig
  // startdato — ellers er der ingenting at vise, og en fejlbesked her ville komme,
  // før brugeren var færdig med at udfylde.
  const forhaandsvisning = (() => {
    if (!erGentagelse(indtastning.gentagelse) || indtastning.dato === "") return null;

    const afslutning: Afslutning =
      indtastning.afslutning === "slutdato"
        ? { slags: "slutdato", dato: indtastning.slutdato }
        : { slags: "antal", antal: Number(indtastning.antal) };

    if (afslutning.slags === "slutdato" && afslutning.dato === "") return null;

    return serieDatoer(indtastning.dato, indtastning.gentagelse, afslutning);
  })();

  const nulstil = () => {
    setRedigeret(TOM_ADMIN_INDTASTNING);
    setLukketSvar(resultat);
  };

  if (visning.tilstand === "ok") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Bekræftet</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          {visning.oprettede.length === 1
            ? "Bookingen er oprettet"
            : `${visning.oprettede.length} bookinger er oprettet`}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {visning.lokaleNavn}
          {visning.serieTekst ? ` · ${visning.serieTekst}` : ""}
        </p>

        {visning.sprunget > 0 && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {visning.sprunget === 1
              ? "1 dato blev sprunget over, fordi tidsrummet var optaget."
              : `${visning.sprunget} datoer blev sprunget over, fordi tidsrummene var optaget.`}
          </p>
        )}

        <ul className="mt-4 grid gap-1 text-sm text-slate-700">
          {visning.oprettede.map((d) => (
            <li key={d.dato} className="flex flex-wrap gap-x-2">
              <span className="font-medium text-slate-900">{d.dag}</span>
              <span className="tabular-nums text-slate-600">{d.klokke}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Bookeren har fået én kvitteringsmail med alle datoerne.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/lokalebooking"
            prefetch={false}
            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            Til bookinglisten
          </Link>
          <button
            type="button"
            onClick={nulstil}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Opret en mere
          </button>
        </div>
      </div>
    );
  }

  const konflikt = visning.tilstand === "konflikt" ? visning : null;

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {visning.tilstand === "fejl" && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-bold">Bookingen blev ikke oprettet</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {visning.fejl.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className={MAERKAT} htmlFor="lokale">
            Lokale
          </label>
          <select
            id="lokale"
            name="lokale"
            required
            value={indtastning.lokale}
            onChange={(e) => saetFelt("lokale", e.target.value)}
            className={`mt-1.5 ${FELT}`}
          >
            <option value="">Vælg lokale</option>
            {lokaler.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.navn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={MAERKAT} htmlFor="dato">
            Dato
          </label>
          <input
            id="dato"
            name="dato"
            type="date"
            required
            min={iDag}
            max={maksDato}
            value={indtastning.dato}
            onChange={(e) => saetDato(e.target.value)}
            className={`mt-1.5 ${FELT}`}
          />
        </div>

        <div>
          <label className={MAERKAT} htmlFor="start">
            Fra
          </label>
          <select
            id="start"
            name="start"
            required
            disabled={indtastning.dato === ""}
            value={indtastning.start}
            onChange={(e) => saetStart(e.target.value)}
            className={`mt-1.5 ${FELT}`}
          >
            <option value="">Vælg</option>
            {startMuligheder.map((m) => (
              <option key={m} value={m}>
                {minutterTilKlokke(m)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={MAERKAT} htmlFor="slut">
            Til
          </label>
          <select
            id="slut"
            name="slut"
            required
            disabled={indtastning.start === ""}
            value={indtastning.slut}
            onChange={(e) => saetFelt("slut", e.target.value)}
            className={`mt-1.5 ${FELT}`}
          >
            <option value="">Vælg</option>
            {slutMuligheder.map((m) => (
              <option key={m} value={m}>
                {minutterTilKlokke(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Åbent kl. 14.00–22.00 på hverdage og kl. 09.00–22.00 i weekenden. Alle tider er danske. Der
        kan bookes højst 6 måneder frem — også for en serie.
      </p>

      {/* Gentagelsen. Er der intet mønster, er resten af sektionen uden betydning
          og vises ikke: en formular med fem felter, der ikke bruges, er sværere at
          overskue end en, der vokser, når man beder om det. */}
      <fieldset className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-sm font-bold text-slate-950">Gentagelse</legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={MAERKAT} htmlFor="gentagelse">
              Mønster
            </label>
            <select
              id="gentagelse"
              name="gentagelse"
              value={indtastning.gentagelse}
              onChange={(e) => saetFelt("gentagelse", e.target.value)}
              className={`mt-1.5 ${FELT}`}
            >
              <option value="">Gentages ikke</option>
              {GENTAGELSER.map((g) => (
                <option key={g} value={g}>
                  {GENTAGELSE_TEKST[g]}
                </option>
              ))}
            </select>
          </div>

          {indtastning.gentagelse !== "" && (
            <>
              <div>
                <label className={MAERKAT} htmlFor="afslutning">
                  Slutter
                </label>
                <select
                  id="afslutning"
                  name="afslutning"
                  value={indtastning.afslutning}
                  onChange={(e) => saetFelt("afslutning", e.target.value)}
                  className={`mt-1.5 ${FELT}`}
                >
                  <option value="antal">Efter et antal bookinger</option>
                  <option value="slutdato">På en slutdato</option>
                </select>
              </div>

              {indtastning.afslutning === "slutdato" ? (
                <div>
                  <label className={MAERKAT} htmlFor="slutdato">
                    Sidste dato
                  </label>
                  <input
                    id="slutdato"
                    name="slutdato"
                    type="date"
                    required
                    min={indtastning.dato || iDag}
                    max={maksDato}
                    value={indtastning.slutdato}
                    onChange={(e) => saetFelt("slutdato", e.target.value)}
                    className={`mt-1.5 ${FELT}`}
                  />
                </div>
              ) : (
                <div>
                  <label className={MAERKAT} htmlFor="antal">
                    Antal bookinger
                  </label>
                  <input
                    id="antal"
                    name="antal"
                    type="number"
                    required
                    min={2}
                    max={MAKS_FOREKOMSTER}
                    step={1}
                    value={indtastning.antal}
                    onChange={(e) => saetFelt("antal", e.target.value)}
                    className={`mt-1.5 ${FELT}`}
                  />
                  <p className="mt-1 text-xs text-slate-500">Den første booking tæller med.</p>
                </div>
              )}
            </>
          )}
        </div>

        {forhaandsvisning && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            {forhaandsvisning.ok ? (
              <>
                <p className="text-sm font-semibold text-slate-800">
                  Serien giver {forhaandsvisning.datoer.length}{" "}
                  {forhaandsvisning.datoer.length === 1 ? "booking" : "bookinger"}
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                  {forhaandsvisning.datoer.slice(0, VIS_HOEJST).map((d) => (
                    <li key={d}>{datoTekst(d)}</li>
                  ))}
                  {forhaandsvisning.datoer.length > VIS_HOEJST && (
                    <li className="font-semibold text-slate-700">
                      + {forhaandsvisning.datoer.length - VIS_HOEJST} flere, til og med{" "}
                      {datoTekst(forhaandsvisning.datoer[forhaandsvisning.datoer.length - 1])}
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Alle datoerne tjekkes for konflikter, før noget gemmes.
                </p>
              </>
            ) : (
              <p className="text-sm text-amber-900">{forhaandsvisning.fejl}</p>
            )}
          </div>
        )}
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={MAERKAT} htmlFor="formaal">
            Formål
          </label>
          <input
            id="formaal"
            name="formaal"
            type="text"
            required
            maxLength={200}
            value={indtastning.formaal}
            onChange={(e) => saetFelt("formaal", e.target.value)}
            placeholder="Fx trænermøde, forældremøde, afslutning"
            className={`mt-1.5 ${FELT}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={MAERKAT} htmlFor="hold">
            Hold
            <span className={VALGFRI}>valgfrit</span>
          </label>
          <input
            id="hold"
            name="hold"
            type="text"
            maxLength={100}
            value={indtastning.hold}
            onChange={(e) => saetFelt("hold", e.target.value)}
            placeholder="Fx U15 drenge"
            className={`mt-1.5 ${FELT}`}
          />
        </div>

        <div>
          <label className={MAERKAT} htmlFor="navn">
            Navn på den, der booker
          </label>
          <input
            id="navn"
            name="navn"
            type="text"
            required
            maxLength={100}
            value={indtastning.navn}
            onChange={(e) => saetFelt("navn", e.target.value)}
            className={`mt-1.5 ${FELT}`}
          />
        </div>

        <div>
          <label className={MAERKAT} htmlFor="mobil">
            Mobil
          </label>
          <input
            id="mobil"
            name="mobil"
            type="tel"
            required
            maxLength={20}
            value={indtastning.mobil}
            onChange={(e) => saetFelt("mobil", e.target.value)}
            className={`mt-1.5 ${FELT}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={MAERKAT} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={indtastning.email}
            onChange={(e) => saetFelt("email", e.target.value)}
            className={`mt-1.5 ${FELT}`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Kvitteringen sendes hertil. Skriv den adresse, bookeren selv bruger.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className={MAERKAT} htmlFor="besked">
            Besked
            <span className={VALGFRI}>valgfrit</span>
          </label>
          <textarea
            id="besked"
            name="besked"
            rows={3}
            maxLength={2000}
            value={indtastning.besked}
            onChange={(e) => saetFelt("besked", e.target.value)}
            placeholder="Særlige ønsker, antal deltagere, borde og stole"
            className={`mt-1.5 ${FELT}`}
          />
        </div>
      </div>

      {/* Konflikterne. Ingenting er gemt på dette tidspunkt — hele oprettelsen
          blev holdt tilbage, netop for at det her valg kunne træffes først. */}
      {konflikt && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950"
        >
          <p className="font-bold">
            {konflikt.konflikter.length === 1
              ? "1 af datoerne er allerede optaget"
              : `${konflikt.konflikter.length} af datoerne er allerede optaget`}
          </p>
          <p className="mt-1 leading-6">
            Der er ikke oprettet noget endnu. Vælg, om de øvrige datoer skal oprettes, eller
            annullér og ret tidsrummet.
          </p>

          <ul className="mt-3 grid gap-1.5">
            {konflikt.konflikter.map((k) => (
              <li key={k.dato} className="flex flex-wrap gap-x-2 leading-6">
                <span className="font-semibold">{k.dag}</span>
                <span className="tabular-nums">{k.klokke}</span>
                <span className="text-amber-800">
                  — {k.formaal} ({k.navn}
                  {k.status === "afventer" ? ", afventer godkendelse" : ""})
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {konflikt.ledige.length > 0 ? (
              <button
                type="submit"
                name={SPRING_OVER_FELT}
                value="1"
                disabled={venter}
                className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {venter
                  ? "Opretter …"
                  : `Opret de øvrige ${konflikt.ledige.length} og spring de optagede over`}
              </button>
            ) : (
              <p className="font-semibold">
                Alle datoerne er optaget, så der er ikke noget at oprette.
              </p>
            )}
            <button
              type="button"
              onClick={() => setLukketSvar(resultat)}
              disabled={venter}
              className="rounded-lg border border-amber-400 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annullér oprettelsen
            </button>
          </div>
        </div>
      )}

      {!konflikt && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={venter}
            className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {venter
              ? "Opretter …"
              : forhaandsvisning?.ok && forhaandsvisning.datoer.length > 1
                ? `Opret ${forhaandsvisning.datoer.length} bookinger`
                : "Opret booking"}
          </button>
          <p className="text-xs leading-5 text-slate-500">
            Bookingen er bekræftet med det samme og skal ikke godkendes.
          </p>
        </div>
      )}
    </form>
  );
}
