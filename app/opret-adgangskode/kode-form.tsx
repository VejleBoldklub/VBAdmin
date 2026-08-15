"use client";

import { useActionState } from "react";
import { saetAdgangskode, type KodeResultat } from "./actions";

const FELT =
  "mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

export default function KodeForm() {
  const [resultat, formAction, venter] = useActionState<KodeResultat, FormData>(
    saetAdgangskode,
    undefined
  );

  return (
    <form action={formAction} className="mt-6">
      <label className="block">
        <span className={ETIKET}>Ny adgangskode</span>
        <input
          className={FELT}
          type="password"
          name="adgangskode"
          autoComplete="new-password"
          minLength={10}
          required
          autoFocus
        />
      </label>

      <label className="mt-4 block">
        <span className={ETIKET}>Gentag adgangskode</span>
        <input
          className={FELT}
          type="password"
          name="gentag"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </label>

      <button
        type="submit"
        disabled={venter}
        className="mt-6 w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
      >
        {venter ? "Gemmer…" : "Gem adgangskode"}
      </button>

      {resultat?.fejl && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
          {resultat.fejl}
        </p>
      )}
    </form>
  );
}
