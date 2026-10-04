import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAltIndhold } from "@/lib/infoskaerm/data";
import { tilDagIndhold, type DagFarve } from "@/lib/infoskaerm/content";
import { billedBase } from "@/lib/infoskaerm/billeder";
import { getAlleDesigns } from "@/lib/infoskaerm/design-data";
import DesignEditor from "./design-editor";

// Designeditoren til infoskærmen, én farve ad gangen.
//
// Ruten ligger under /admin/infoskaerm og kræver dermed modulet infoskaerm i
// proxy.ts. Handlingerne kontrollerer derudover deres egen adgang — se
// actions.ts.
export const dynamic = "force-dynamic";

const FARVER: readonly DagFarve[] = ["Rød", "Gul", "Grøn"];

const PRIK: Record<DagFarve, string> = { Rød: "#B91C1C", Gul: "#D6A800", Grøn: "#2E8B2E" };

export default async function InfoskaermDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ farve?: string }>;
}) {
  const { farve: valgtFarve } = await searchParams;
  const farve: DagFarve = FARVER.find((f) => f === valgtFarve) ?? "Rød";

  const [{ designs, fejl }, { indhold }] = await Promise.all([
    getAlleDesigns(supabaseAdmin),
    getAltIndhold(supabaseAdmin),
  ]);

  const andre = FARVER.filter((f) => f !== farve).flatMap((f) => {
    const d = designs[f].design;
    return d ? [{ farve: f, design: d }] : [];
  });

  return (
    <AdminPageShell eyebrow="Infoskærm Cafeteria" title="Design" wide>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Design skærmen frit for hver farve: tekst, skrifttyper, farver, billeder og felter, der kan
        trækkes rundt og gøres større eller mindre. Et design kommer først på skærmen, når det er
        slået til og gemt. Indtil da viser skærmen kostkortene som hidtil.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/infoskaerm"
          className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          ← Ugeplan
        </Link>

        <nav aria-label="Farve" className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          {FARVER.map((f) => (
            <Link
              key={f}
              href={`/admin/infoskaerm/design?farve=${encodeURIComponent(f)}`}
              aria-current={f === farve ? "page" : undefined}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 ${
                f === farve ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIK[f] }} />
              {f}
              {designs[f].aktiv && (
                <span className="text-xs font-normal opacity-75">· vises</span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {fejl && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-bold">De gemte designs kunne ikke hentes.</p>
          <p className="mt-1 font-mono text-xs leading-5 break-words">{fejl}</p>
          <p className="mt-2">
            Findes tabellen ikke, mangler migrationen{" "}
            <code className="font-mono">supabase/infoskaerm-design.sql</code> at blive kørt i
            Supabase.
          </p>
        </div>
      )}

      {/* Nøglen er farven: skiftes der farve, starter editoren forfra med den
          farves design frem for at beholde den forriges tilstand. */}
      <DesignEditor
        key={farve}
        farve={farve}
        start={designs[farve].design}
        startAktiv={designs[farve].aktiv}
        indhold={tilDagIndhold(indhold[farve])}
        billedBase={billedBase(supabaseAdmin)}
        andre={andre}
      />
    </AdminPageShell>
  );
}
