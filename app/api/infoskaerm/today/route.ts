import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";
import { getTodayPlan } from "@/lib/infoskaerm/data";
import { DAY_CONTENT, farveTilNavn, type DagFarve } from "@/lib/infoskaerm/content";

// Skærmens opdateringskald. Kiosken henter denne rute hvert andet minut, så en
// ændring i adminfladen slår igennem uden at siden genindlæses.
//
// Ruten er offentlig ligesom selve skærmsiden og læser med anon-nøglen. Den
// returnerer det samme, som siden blev gengivet med — farve, navn, besked og
// dagens indhold — så klienten ikke selv skal kende sammenhængen mellem farve og
// indhold.
export const dynamic = "force-dynamic"; // altid frisk data, aldrig cachet

export async function GET() {
  const row = await getTodayPlan(supabasePublic());
  const farve: DagFarve = row?.farve ?? "Grøn";

  return NextResponse.json({
    ok: true,
    farve,
    navn: farveTilNavn(farve),
    ekstraBesked: row?.ekstra_besked ?? "",
    content: DAY_CONTENT[farve],
  });
}
