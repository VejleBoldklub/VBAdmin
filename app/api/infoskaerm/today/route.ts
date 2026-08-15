import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";
import { getIndhold, getTodayPlan } from "@/lib/infoskaerm/data";
import type { DagFarve } from "@/lib/infoskaerm/content";

// Skærmens opdateringskald. Kiosken henter denne rute hvert andet minut, så en
// ændring i adminfladen slår igennem uden at siden genindlæses.
//
// Både dagens farve, beskeden og kostindholdet hentes her. Retter Helene
// teksterne under Infoskærm → Indhold, er de på skærmen ved næste opdatering,
// uden at kiosken skal genstartes.
//
// Ruten er offentlig ligesom selve skærmsiden og læser med anon-nøglen.
export const dynamic = "force-dynamic"; // altid frisk data, aldrig cachet

export async function GET() {
  const client = supabasePublic();

  const row = await getTodayPlan(client);
  const farve: DagFarve = row?.farve ?? "Grøn";
  const content = await getIndhold(client, farve);

  return NextResponse.json({
    ok: true,
    farve,
    navn: content.shortName,
    ekstraBesked: row?.ekstra_besked ?? "",
    content,
  });
}
