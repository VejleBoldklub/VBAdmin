import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAltIndhold } from "@/lib/infoskaerm/data";
import type { DagFarve } from "@/lib/infoskaerm/content";
import IndholdForm from "./indhold-form";

// Kostindholdet bag infoskærmen, én formular pr. farve.
//
// Ruten ligger under /admin og er dermed dækket af proxy.ts. Handlingen
// kontrollerer derudover sin egen adgang — se actions.ts.
export const dynamic = "force-dynamic";

const FARVER: readonly DagFarve[] = ["Rød", "Gul", "Grøn"];

export default async function InfoskaermIndholdPage() {
  const { indhold, fejl } = await getAltIndhold(supabaseAdmin);

  return (
    <AdminPageShell eyebrow="Infoskærm" title="Indhold">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Teksterne på cafeteriets infoskærm, én opsætning pr. farve. Ændringer er på skærmen ved
        næste opdatering, højst to minutter — kiosken skal ikke genstartes.
      </p>

      <Link
        href="/admin/infoskaerm"
        className="mt-4 inline-block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        ← Ugeplan
      </Link>

      {fejl && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-bold">Indholdet kunne ikke hentes.</p>
          <p className="mt-1 font-mono text-xs leading-5 break-words">{fejl}</p>
          <p className="mt-2">
            Findes tabellen ikke, mangler migrationen{" "}
            <code className="font-mono">supabase/infoskaerm-indhold.sql</code> at blive kørt i
            Supabase. Felterne nedenfor viser indtil da de indbyggede værdier, og et tryk på Gem
            vil fejle.
          </p>
        </div>
      )}

      {FARVER.map((farve) => (
        <IndholdForm key={farve} start={indhold[farve]} />
      ))}
    </AdminPageShell>
  );
}
