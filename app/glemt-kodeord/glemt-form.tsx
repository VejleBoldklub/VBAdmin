"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendNulstilling, type NulstilResultat } from "./actions";

const FELT =
  "mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

export default function GlemtForm() {
  const [resultat, formAction, venter] = useActionState<NulstilResultat, FormData>(
    sendNulstilling,
    undefined
  );

  // Kvitteringen erstatter formularen. Står feltet tilbage, indbyder det til at
  // prøve en adresse mere for at se, om svaret skifter — og svaret skifter
  // aldrig, netop derfor.
  if (resultat && "sendt" in resultat) {
    return (
      <div className="mt-6">
        <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
          Hvis adressen findes i systemet, har vi sendt et link til at vælge en ny adgangskode.
          Linket udløber efter en times tid.
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Kom der ingen mail, så kig i spamfilteret — eller spørg en administrator, om din adresse
          er oprettet.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Tilbage til login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6">
      <label className="block">
        <span className={ETIKET}>E-mail</span>
        <input
          className={FELT}
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
        />
      </label>

      <button
        type="submit"
        disabled={venter}
        className="mt-6 w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
      >
        {venter ? "Sender…" : "Send nulstillingslink"}
      </button>

      {resultat && "fejl" in resultat && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
          {resultat.fejl}
        </p>
      )}

      <Link
        href="/login"
        className="mt-5 inline-block text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        Tilbage til login
      </Link>
    </form>
  );
}
