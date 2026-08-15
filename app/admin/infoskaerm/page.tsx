import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUpcomingPlan, todayKey } from "@/lib/infoskaerm/data";
import DayRow from "./day-row";

// Ugeplanen bag cafeteriets infoskærm. Ruten ligger under /admin og er dermed
// dækket af Basic Auth i proxy.ts. Handlingerne kontrollerer derudover deres
// egen adgang — se actions.ts.
export const dynamic = "force-dynamic";

const ANTAL_DAGE = 14;

// Dagene regnes ud fra dagens dato i Europe/Copenhagen, ikke serverens.
//
// Vercel kører i UTC, og en liste bygget på serverens dato ville i timerne efter
// dansk midnat starte en dag for tidligt — mens getUpcomingPlan henter fra
// dagens danske dato. Listen ville så vise en dag, der ikke kunne hentes data
// til, og resten ville stå forskudt.
//
// Der regnes i hele døgn med Date.UTC frem for at lægge timer til, så
// sommertidsskiftet ikke kan give to ens eller en manglende dag.
function dageFra(start: string, antal: number): string[] {
  const [aar, maaned, dag] = start.split("-").map(Number);

  return Array.from({ length: antal }, (_, i) =>
    new Date(Date.UTC(aar, maaned - 1, dag + i)).toISOString().slice(0, 10)
  );
}

function labelFor(dato: string): string {
  // Middag UTC, så datoen ikke kan tippe til nabodøgnet under formateringen.
  return new Date(dato + "T12:00:00Z").toLocaleDateString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function InfoskaermAdminPage() {
  const { raekker, fejl } = await getUpcomingPlan(supabaseAdmin, ANTAL_DAGE);
  const efterDato = new Map(raekker.map((r) => [r.dato, r]));
  const dage = dageFra(todayKey(), ANTAL_DAGE);

  return (
    <AdminPageShell eyebrow="Infoskærm" title="Cafeteria">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Vælg farve for hver dag, og skriv eventuelt en besked, der vises på skærmen den dag.
        Farven bestemmer selv dagens navn: Rød er Performance, Gul er Recovery, Grøn er Health.
        Ændringer slår igennem på skærmen ved næste opdatering, højst to minutter.
      </p>

      <Link
        href="/admin/infoskaerm/indhold"
        className="mt-4 inline-block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        Redigér kostindhold →
      </Link>

      {/* Kan planen ikke læses, siger siden det. Ellers ligner en fejl bare en
          uge, hvor ingen har sat farver på endnu. */}
      {fejl && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-bold">Ugeplanen kunne ikke hentes.</p>
          <p className="mt-1 font-mono text-xs leading-5 break-words">{fejl}</p>
          <p className="mt-2">
            Findes tabellen ikke, mangler migrationen{" "}
            <code className="font-mono">supabase/infoskaerm-ugeplan.sql</code> at blive kørt i
            Supabase.
          </p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {dage.map((dato) => {
          const row = efterDato.get(dato);
          return (
            <DayRow
              key={dato}
              dato={dato}
              labelDato={labelFor(dato)}
              initialFarve={row?.farve ?? "Grøn"}
              initialBesked={row?.ekstra_besked ?? ""}
            />
          );
        })}
      </div>
    </AdminPageShell>
  );
}
