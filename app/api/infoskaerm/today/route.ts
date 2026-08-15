import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";
import { getIndhold, getTodayPlan } from "@/lib/infoskaerm/data";

// Skærmens opdateringskald. Kiosken henter denne rute hvert andet minut, så en
// ændring i adminfladen slår igennem uden at siden genindlæses.
//
// Svaret har to former: harPlan true med farve, besked og indhold, eller
// harPlan false, når ingen har sat en farve for dagen. Der falder bevidst ikke
// en farve på plads i sidstnævnte tilfælde — skærmen skal kunne vise, at valget
// mangler, frem for at vise et kostkort, ingen har valgt.
//
// Ruten er offentlig ligesom selve skærmsiden og læser med anon-nøglen.
export const dynamic = "force-dynamic"; // altid frisk data, aldrig cachet

export async function GET() {
  const client = supabasePublic();
  const row = await getTodayPlan(client);

  if (!row) {
    return NextResponse.json({ ok: true, harPlan: false });
  }

  const content = await getIndhold(client, row.farve);

  return NextResponse.json({
    ok: true,
    harPlan: true,
    farve: row.farve,
    navn: content.shortName,
    ekstraBesked: row.ekstra_besked,
    content,
  });
}
