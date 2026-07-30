"use client";

import type { Indtastning, OpretResultat } from "@/features/lokalebooking/formular";
import { minutterTilKlokke } from "@/features/lokalebooking/regler";

// Bookingformularen. Har ingen egen tilstand: alt kommer fra booking-panel.tsx,
// som er ét sted at læse hvad brugeren har valgt, uanset om valget kom fra
// gitteret eller fra formularens felter.

type BookingFormProps = {
  lokaleNavn: string;
  kraeverGodkendelse: boolean;
  indtastning: Indtastning;
  saetFelt: (felt: keyof Indtastning, vaerdi: string) => void;
  saetDato: (dato: string) => void;
  saetStart: (start: string) => void;
  startMuligheder: number[];
  slutMuligheder: number[];
  minDato: string;
  maksDato: string;
  formAction: (fd: FormData) => void;
  resultat: OpretResultat;
  venter: boolean;
  // Lukker modalen. Formularen kender ikke selve dialogen — den bliver bedt om at
  // vise en knap, og panelet afgør hvad der sker.
  luk: () => void;
  nulstil: () => void;
};

const FELT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700 disabled:bg-slate-50 disabled:text-slate-400";
const MAERKAT = "block text-sm font-semibold text-slate-800";
const VALGFRI = "ml-1.5 text-xs font-normal text-slate-500";

export default function BookingForm({
  lokaleNavn,
  kraeverGodkendelse,
  indtastning,
  saetFelt,
  saetDato,
  saetStart,
  startMuligheder,
  slutMuligheder,
  minDato,
  maksDato,
  formAction,
  resultat,
  venter,
  luk,
  nulstil,
}: BookingFormProps) {
  if (resultat.tilstand === "ok") {
    return (
      <div className="bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
          {resultat.status === "bekraeftet" ? "Bekræftet" : "Sendt til godkendelse"}
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          {resultat.status === "bekraeftet"
            ? "Lokalet er booket"
            : "Din forespørgsel er registreret"}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {resultat.lokaleNavn}, {resultat.naar}.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {resultat.status === "bekraeftet"
            ? "Tidsrummet er reserveret og vises nu i ugeoversigten."
            : "Tidsrummet er reserveret, indtil forespørgslen er behandlet. Klubben godkender eller afviser den, og du får besked."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={luk}
            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            Luk
          </button>
          <button
            type="button"
            onClick={nulstil}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Book en mere
          </button>
        </div>
      </div>
    );
  }

  const startValgt = indtastning.start !== "";

  return (
    <form action={formAction} className="bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">Book {lokaleNavn}</h3>
        <button
          type="button"
          onClick={luk}
          disabled={venter}
          aria-label="Luk"
          className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50"
        >
          ×
        </button>
      </div>
      {/* Ingen forklarende linje her. Modalen skal kunne være i en iframe på 700
          px, og hver linje tekst er plads, der ikke kan bruges på et felt.
          Tidsrummet står allerede udfyldt øverst, og at det kan rettes, ser man
          ved at klikke på det. */}

      {resultat.tilstand === "fejl" && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-bold">Bookingen blev ikke oprettet</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {resultat.fejl.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={MAERKAT} htmlFor="dato">
            Dato
          </label>
          <input
            id="dato"
            name="dato"
            type="date"
            required
            min={minDato}
            max={maksDato}
            value={indtastning.dato}
            onChange={(e) => saetDato(e.target.value)}
            className={`mt-1 ${FELT}`}
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
            className={`mt-1 ${FELT}`}
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
            disabled={!startValgt}
            value={indtastning.slut}
            onChange={(e) => saetFelt("slut", e.target.value)}
            className={`mt-1 ${FELT}`}
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

      {/* Åbningstiderne stod her som en linje for sig. De er taget ud, fordi de
          allerede fremgår to andre steder: kalenderen tegner lukket tid som
          lukket, og listerne over Fra og Til indeholder kun timer, lokalet er
          åbent. Linjen kostede plads uden at sige noget nyt. */}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
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
            placeholder="Fx trænermøde"
            className={`mt-1 ${FELT}`}
          />
        </div>

        <div>
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
            className={`mt-1 ${FELT}`}
          />
        </div>

        <div>
          <label className={MAERKAT} htmlFor="navn">
            Navn
          </label>
          <input
            id="navn"
            name="navn"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            value={indtastning.navn}
            onChange={(e) => saetFelt("navn", e.target.value)}
            className={`mt-1 ${FELT}`}
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
            autoComplete="tel"
            value={indtastning.mobil}
            onChange={(e) => saetFelt("mobil", e.target.value)}
            className={`mt-1 ${FELT}`}
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
            autoComplete="email"
            value={indtastning.email}
            onChange={(e) => saetFelt("email", e.target.value)}
            className={`mt-1 ${FELT}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={MAERKAT} htmlFor="besked">
            Besked
            <span className={VALGFRI}>valgfrit</span>
          </label>
          <textarea
            id="besked"
            name="besked"
            rows={2}
            maxLength={2000}
            value={indtastning.besked}
            onChange={(e) => saetFelt("besked", e.target.value)}
            placeholder="Særlige ønsker, antal deltagere, borde og stole"
            className={`mt-1 ${FELT}`}
          />
        </div>
      </div>

      {/* Fælde for robotter. Skjult for mennesker, og er den udfyldt, svarer
          serveren som om bookingen blev oprettet uden at oprette noget — se
          HONEYPOT i features/lokalebooking/opret.ts. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="hjemmeside">Hjemmeside</label>
        <input id="hjemmeside" name="hjemmeside" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={venter}
          className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {venter ? "Sender …" : kraeverGodkendelse ? "Send forespørgsel" : "Book lokalet"}
        </button>
        <p className="text-xs leading-5 text-slate-500">
          {kraeverGodkendelse
            ? "Cafeteriet skal godkendes af klubben, før bookingen er endelig."
            : "Mødelokalet er booket med det samme."}
        </p>
      </div>
    </form>
  );
}
