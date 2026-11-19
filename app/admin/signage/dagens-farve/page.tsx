import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUpcomingPlan, todayKey } from "@/lib/infoskaerm/data";
import { dageFra, labelFor } from "@/lib/infoskaerm/dato";
import DayRow from "@/app/admin/infoskaerm/day-row";
import { ETIKET, KNAP, SignageShell } from "../ui";

// Dagens farve på cafeteriets infoskærm, sat fra Skærme Alliancen.
//
// Det er den samme ugeplan som under Infoskærm Cafeteria — samme tabel, samme
// handling. Helene bruger den dér, Asger her. Ændres en dag det ene sted, står
// den ændret det andet.
export const dynamic = "force-dynamic";
export const metadata = { title: "Dagens farve — Skærme Alliancen" };

const ANTAL_DAGE = 14;

export default async function DagensFarve() {
  const { raekker, fejl } = await getUpcomingPlan(supabaseAdmin, ANTAL_DAGE);
  const efterDato = new Map(raekker.map((r) => [r.dato, r]));
  const dage = dageFra(todayKey(), ANTAL_DAGE);

  return (
    <SignageShell titel="Dagens farve" undertitel="Rød, Gul eller Grøn på cafeteriets infoskærm" aktiv="/admin/signage/dagens-farve">
      <div className="flex flex-wrap items-center gap-3">
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          Vælg farve for hver dag, og skriv eventuelt en besked til skærmen. Rød er Performance, Gul er Recovery, Grøn er
          Health. Det er den samme ugeplan som under Infoskærm Cafeteria, og ændringer slår igennem på skærmen inden for
          to minutter.
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/admin/infoskaerm/indhold" className={KNAP}>
            Kostindhold →
          </Link>
          <Link href="/admin/infoskaerm/design" className={KNAP}>
            Design pr. farve →
          </Link>
        </div>
      </div>

      {fejl && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-200">
          Ugeplanen kunne ikke hentes: {fejl}
        </div>
      )}

      <p className={`${ETIKET} mt-6`}>De næste {ANTAL_DAGE} dage</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#1e2a44] bg-white text-slate-950 shadow-sm">
        {dage.map((dato) => {
          const row = efterDato.get(dato);
          return (
            <DayRow
              key={dato}
              dato={dato}
              labelDato={labelFor(dato)}
              initialFarve={row?.farve ?? null}
              initialBesked={row?.ekstra_besked ?? ""}
            />
          );
        })}
      </div>
    </SignageShell>
  );
}
