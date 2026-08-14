import type { SupabaseClient } from "@supabase/supabase-js";
import type { DagFarve } from "./content";

// Læsning af ugeplanen bag infoskærmen.
//
// Klienten sendes ind som argument frem for at blive importeret her. Den
// offentlige skærm læser med anon-nøglen bag rækkesikkerheden, adminfladen
// skriver og læser med service_role. Begge veje bruger de samme to funktioner,
// og det er kaldstedet, der afgør hvilken nøgle der er i brug — samme opdeling
// som lokalebooking bruger mellem den offentlige rute og adminfladen.

export interface UgeplanRow {
  id: string;
  dato: string; // yyyy-mm-dd
  farve: DagFarve;
  ekstra_besked: string;
}

const FARVER: readonly DagFarve[] = ["Rød", "Gul", "Grøn"];

// Rækker fra databasen er ukendte data ved systemgrænsen og valideres, før de
// bruges som UgeplanRow. Farven har ganske vist en check-constraint i skemaet,
// men typen her må ikke hvile på en antagelse om, at skemaet altid er i takt med
// koden: en række med en ukendt farve ville ellers slå op i DAY_CONTENT og give
// `undefined`, og skærmen ville gå i sort på en tom side frem for at falde
// tilbage til Grøn.
function erUgeplanRow(vaerdi: unknown): vaerdi is UgeplanRow {
  if (typeof vaerdi !== "object" || vaerdi === null) return false;

  const r = vaerdi as Record<string, unknown>;

  return (
    typeof r.id === "string" &&
    typeof r.dato === "string" &&
    typeof r.farve === "string" &&
    FARVER.includes(r.farve as DagFarve) &&
    typeof r.ekstra_besked === "string"
  );
}

const KOLONNER = "id, dato, farve, ekstra_besked";

// Dagens dato i Europe/Copenhagen, ikke i serverens tidszone.
//
// Vercel kører i UTC, og en dato udledt derfra ville skifte dag ved midnat UTC —
// altså kl. 01 eller 02 dansk tid. Skærmen ville så vise næste dags farve i en
// time eller to, mens cafeteriet stadig havde aftenen før. sv-SE er valgt, fordi
// formatet allerede er yyyy-mm-dd og dermed matcher en date-kolonne direkte.
export function todayKey(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getTodayPlan(client: SupabaseClient): Promise<UgeplanRow | null> {
  const dato = todayKey();

  const { data, error } = await client
    .from("infoskaerm_ugeplan")
    .select(KOLONNER)
    .eq("dato", dato)
    .maybeSingle();

  if (error) {
    console.error("infoskaerm_ugeplan fetch fejl:", error);
    return null;
  }

  // En manglende række er ikke en fejl. Har ingen sat en farve på dagen, falder
  // skærmen tilbage til Grøn — det er den almindelige dag.
  return erUgeplanRow(data) ? data : null;
}

export async function getUpcomingPlan(
  client: SupabaseClient,
  days = 14
): Promise<UgeplanRow[]> {
  const { data, error } = await client
    .from("infoskaerm_ugeplan")
    .select(KOLONNER)
    .gte("dato", todayKey())
    .order("dato", { ascending: true })
    .limit(days);

  if (error) {
    console.error("infoskaerm_ugeplan liste-fejl:", error);
    return [];
  }

  return Array.isArray(data) ? data.filter(erUgeplanRow) : [];
}
