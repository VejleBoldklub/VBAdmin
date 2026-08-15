"use client";

import { useState, useTransition } from "react";
import type { Modul } from "@/lib/adgang";
import type { AdminBrugerRaekke } from "@/lib/administration";
import { fjernBruger, opdaterBruger } from "./actions";
import { ModulVaelger } from "./modul-vaelger";

export default function BrugerRaekke({
  bruger,
  erMigSelv,
}: {
  bruger: AdminBrugerRaekke;
  erMigSelv: boolean;
}) {
  const [rolle, setRolle] = useState<"admin" | "user">(bruger.rolle);
  const [moduler, setModuler] = useState<Modul[]>(bruger.moduler);
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);
  const [bekraeftFjern, setBekraeftFjern] = useState(false);
  const [isPending, startTransition] = useTransition();

  function kald(handling: () => Promise<{ ok: true } | { ok: false; fejl: string }>) {
    startTransition(async () => {
      try {
        const svar = await handling();

        if (svar.ok) {
          setFejl(null);
          setGemt(true);
        } else {
          setFejl(svar.fejl);
          setGemt(false);
        }
      } catch (err) {
        console.error("Kald til brugerhandling fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setGemt(false);
      }
    });
  }

  return (
    <div className="border-b border-slate-200 px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">
            {bruger.email}
            {erMigSelv && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                dig
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Oprettet {new Date(bruger.oprettet).toLocaleDateString("da-DK")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm">
            <span className="sr-only">Rolle for {bruger.email}</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              value={rolle}
              onChange={(e) => {
                setRolle(e.target.value === "admin" ? "admin" : "user");
                setGemt(false);
              }}
            >
              <option value="user">Bruger</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={() => kald(() => opdaterBruger(bruger.authUserId, rolle, moduler))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            {isPending ? "Gemmer…" : "Gem"}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <ModulVaelger
          valgte={moduler}
          erAdministrator={rolle === "admin"}
          onSkift={(m) => {
            setModuler(m);
            setGemt(false);
          }}
          navnePraefiks={bruger.authUserId}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {/* Egen række kan ikke fjernes. En administrator, der sletter sig selv,
            mister adgangen i samme klik og kan ikke fortryde. */}
        {!erMigSelv &&
          (bekraeftFjern ? (
            <span className="flex items-center gap-3 text-sm">
              <span className="text-slate-700">Fjern {bruger.email}?</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => kald(() => fjernBruger(bruger.authUserId))}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                Ja, fjern
              </button>
              <button
                type="button"
                onClick={() => setBekraeftFjern(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                Fortryd
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setBekraeftFjern(true)}
              className="rounded-lg px-2.5 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              Fjern
            </button>
          ))}

        <span aria-live="polite" className="text-sm text-slate-600">
          {gemt ? "Gemt ✓" : ""}
        </span>
      </div>

      {fejl && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {fejl}
        </p>
      )}
    </div>
  );
}
