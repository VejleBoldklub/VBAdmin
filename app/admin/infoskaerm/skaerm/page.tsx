import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAlleBilleder, getOpsaetningTilAdmin } from "@/lib/infoskaerm/billeder";
import OpsaetningForm from "./opsaetning-form";
import BilledUpload from "./billed-upload";
import BilledListe from "./billed-liste";

// Skærmens opsætning og billederne.
//
// Ruten ligger under /admin/infoskaerm og kræver dermed modulet infoskaerm i
// proxy.ts. Handlingerne kontrollerer derudover deres egen adgang — se
// actions.ts.
export const dynamic = "force-dynamic";

export default async function InfoskaermSkaermPage() {
  const [{ opsaetning, fejl: opsaetningFejl }, { billeder, fejl: billedFejl }] =
    await Promise.all([getOpsaetningTilAdmin(supabaseAdmin), getAlleBilleder(supabaseAdmin)]);

  const fejl = opsaetningFejl ?? billedFejl;

  return (
    <AdminPageShell eyebrow="Infoskærm Cafeteria" title="Skærm og billeder">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Vælg hvordan skærmen er sat op, og læg billeder op, fx af dagens mad. Ændringer er på
        skærmen ved næste opdatering, højst to minutter — kiosken skal ikke genstartes.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/admin/infoskaerm"
          className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          ← Ugeplan
        </Link>
        <Link
          href="/admin/infoskaerm/indhold"
          className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Kostindhold →
        </Link>
      </div>

      {fejl && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-bold">Opsætning eller billeder kunne ikke hentes.</p>
          <p className="mt-1 font-mono text-xs leading-5 break-words">{fejl}</p>
          <p className="mt-2">
            Findes tabellerne ikke, mangler migrationen{" "}
            <code className="font-mono">supabase/infoskaerm-billeder.sql</code> at blive kørt i
            Supabase. Indtil da viser skærmen kostplanen som hidtil.
          </p>
        </div>
      )}

      <OpsaetningForm start={opsaetning} />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">Billeder</h2>
        <p className="mt-1 text-sm text-slate-600">
          Billeder uden dato vises hver dag. Får et billede en dato, vises det kun den dag. Et
          skjult billede bliver liggende her og kan slås til igen.
        </p>

        <BilledUpload />
        {/* Nøglen er listen af billeder. Lægges et billede op eller slettes et,
            tegnes listen forfra fra serveren frem for at beholde sin gamle
            tilstand — ellers dukkede det nye billede først op ved genindlæsning. */}
        <BilledListe key={billeder.map((b) => b.id).join(",")} start={billeder} />
      </section>
    </AdminPageShell>
  );
}
