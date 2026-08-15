"use client";

import { useState, useTransition } from "react";
import type { Modul } from "@/lib/adgang";
import { inviterBruger } from "./actions";
import { ModulVaelger } from "./modul-vaelger";

const FELT =
  "mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

export default function InviterForm() {
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState<"admin" | "user">("user");
  const [moduler, setModuler] = useState<Modul[]>([]);
  const [fejl, setFejl] = useState<string | null>(null);
  const [sendtTil, setSendtTil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function inviter() {
    startTransition(async () => {
      try {
        const svar = await inviterBruger(email, rolle, moduler);

        if (svar.ok) {
          setFejl(null);
          setSendtTil(email.trim().toLowerCase());
          setEmail("");
          setModuler([]);
          setRolle("user");
        } else {
          setFejl(svar.fejl);
          setSendtTil(null);
        }
      } catch (err) {
        console.error("Kald til inviterBruger fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setSendtTil(null);
      }
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold tracking-tight">Invitér en bruger</h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        Brugeren får en mail med et link, hvor de selv vælger deres adgangskode. Der sendes ingen
        adgangskode i mailen.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={ETIKET}>E-mail</span>
          <input
            className={FELT}
            type="email"
            value={email}
            placeholder="navn@vejleboldklub.dk"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className={ETIKET}>Rolle</span>
          <select
            className={FELT}
            value={rolle}
            onChange={(e) => setRolle(e.target.value === "admin" ? "admin" : "user")}
          >
            <option value="user">Bruger — adgang til valgte moduler</option>
            <option value="admin">Administrator — adgang til alt</option>
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className={ETIKET}>Moduler</span>
        <div className="mt-2">
          <ModulVaelger
            valgte={moduler}
            erAdministrator={rolle === "admin"}
            onSkift={setModuler}
            navnePraefiks="ny"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={inviter}
          disabled={isPending || email.trim() === ""}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          {isPending ? "Sender…" : "Send invitation"}
        </button>

        <span aria-live="polite" className="text-sm text-slate-600">
          {sendtTil ? `Invitation sendt til ${sendtTil} ✓` : ""}
        </span>
      </div>

      {fejl && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {fejl}
        </p>
      )}
    </section>
  );
}
