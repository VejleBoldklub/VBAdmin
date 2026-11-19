import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDagtyper } from "@/lib/infoskaerm/data";
import { erStandardDagtype } from "@/lib/infoskaerm/content";
import { KNAP, SignageShell } from "../ui";
import Dagtyper from "./dagtyper";

// Dagtyper til cafeteriets infoskærm: Rød, Gul og Grøn plus egne typer,
// fx "Rød 2". En ny type kopierer kostindhold og design fra en eksisterende.
export const dynamic = "force-dynamic";
export const metadata = { title: "Dagtyper — Skærme Alliancen" };

export default async function DagtyperSide() {
  const typer = await getDagtyper(supabaseAdmin);

  return (
    <SignageShell titel="Dagtyper" undertitel="Rød, Gul, Grøn og egne typer som fx Rød 2" aktiv="/admin/signage/dagtyper">
      <div className="flex flex-wrap items-center gap-3">
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          Opret en ny dagtype ved at kopiere en eksisterende. Den nye type kan derefter vælges under Dagens farve, og
          dens kostindhold og design rettes som de andre. Rød, Gul og Grøn er faste.
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

      <Dagtyper typer={typer.map((t) => ({ ...t, fast: erStandardDagtype(t.farve) }))} />
    </SignageShell>
  );
}
