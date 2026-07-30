"use client";

import { useActionState } from "react";
import type { BeslutSvar } from "@/features/lokalebooking/types";

// Knappen, der udfører beslutningen fra et mail-link.
//
// Hele pointen med at siden findes: mailen indeholder et link, og både
// mailklienter og sikkerhedsfiltre henter links på forhånd for at tjekke dem. Var
// beslutningen knyttet til selve linket, ville en cafeteria-booking kunne blive
// godkendt, uden at et menneske havde set den. Linket viser derfor kun denne
// side, og først et tryk her sender noget af sted.
//
// `art` er en almindelig union frem for typen fra beslutning.ts. Den fil rører
// databasen, og selv en type-import derfra ville binde klientkoden til et modul,
// den ikke skal kende.

type BeslutningFormProps = {
  art: "godkend" | "afvis";
  handling: (forrige: BeslutSvar, fd: FormData) => Promise<BeslutSvar>;
};

export default function BeslutningForm({ art, handling }: BeslutningFormProps) {
  const [svar, formAction, venter] = useActionState<BeslutSvar, FormData>(handling, {
    tilstand: "uroert",
  });

  if (svar.tilstand === "ok") {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-bold text-slate-950">
          {art === "godkend" ? "Bookingen er godkendt." : "Bookingen er afvist."}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          {art === "godkend"
            ? "Bookeren har fået besked på mail, og tidsrummet står nu som bekræftet."
            : "Bookeren har fået besked på mail med din begrundelse, og tidsrummet er givet fri igen."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6">
      {svar.tilstand === "fejl" && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {svar.fejl}
        </p>
      )}

      {art === "afvis" && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="grund">
            Begrundelse
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Bookeren får begrundelsen i afslagsmailen. Skriv den, som den skal læses.
          </p>
          <textarea
            id="grund"
            name="grund"
            rows={3}
            maxLength={500}
            required
            placeholder="Fx: Cafeteriet er reserveret til kampdag."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={venter}
        className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          art === "godkend"
            ? "bg-red-700 hover:bg-red-800 focus-visible:ring-red-700"
            : "bg-slate-800 hover:bg-slate-900 focus-visible:ring-slate-800"
        }`}
      >
        {venter
          ? "Sender …"
          : art === "godkend"
            ? "Ja, godkend bookingen"
            : "Ja, afvis bookingen"}
      </button>
    </form>
  );
}
