import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  DAY_CONTENT,
  erIndholdRow,
  fraDagIndhold,
  tilDagIndhold,
  type DagFarve,
  type DagIndhold,
  type IndholdRow,
} from "./content";

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

const INDHOLD_KOLONNER =
  "farve, titel, undertitel_da, undertitel_en, kortnavn, farvekode, lys_farvekode, blokke";

// Kostindholdet for én farve, med den hardcodede udgave som reserve.
//
// Fejler opslaget, eller består rækken ikke kontrollen, viser skærmen DAY_CONTENT
// frem for ingenting. Det er samme afvejning som resten af den offentlige side:
// en skærm uden opsyn skal hellere vise noget forældet end stå tom.
export async function getIndhold(
  client: SupabaseClient,
  farve: DagFarve
): Promise<DagIndhold> {
  const { data, error } = await client
    .from("infoskaerm_indhold")
    .select(INDHOLD_KOLONNER)
    .eq("farve", farve)
    .maybeSingle();

  if (error) {
    console.error("infoskaerm_indhold fetch fejl:", error);
    return DAY_CONTENT[farve];
  }

  return erIndholdRow(data) ? tilDagIndhold(data) : DAY_CONTENT[farve];
}

// Alle tre farver til adminfladens formular.
//
// Her fylder reserven et andet formål: mangler en farve i tabellen, får
// formularen de hardcodede værdier at starte fra, så den kan gemmes og dermed
// oprette rækken. Ellers ville en manglende seed give en tom formular.
export async function getAltIndhold(
  client: SupabaseClient
): Promise<{ indhold: Record<DagFarve, IndholdRow>; fejl: string | null }> {
  const reserve = {
    Rød: fraDagIndhold("Rød", DAY_CONTENT["Rød"]),
    Gul: fraDagIndhold("Gul", DAY_CONTENT["Gul"]),
    Grøn: fraDagIndhold("Grøn", DAY_CONTENT["Grøn"]),
  };

  const { data, error } = await client.from("infoskaerm_indhold").select(INDHOLD_KOLONNER);

  if (error) {
    console.error("infoskaerm_indhold liste-fejl:", error);
    return { indhold: reserve, fejl: beskrivSupabaseFejl(error) };
  }

  const indhold = { ...reserve };

  for (const raekke of Array.isArray(data) ? data : []) {
    if (erIndholdRow(raekke)) indhold[raekke.farve] = raekke;
  }

  return { indhold, fejl: null };
}

// Databasefejl i klartekst.
//
// Bruges kun på adminfladen, som ligger bag login. En rå fejlbesked fra
// databasen hører ikke hjemme på en offentlig side, men her er den forskellen
// på "prøv igen" og "tabellen findes ikke — kør migrationen".
export function beskrivSupabaseFejl(fejl: PostgrestError): string {
  const dele = [fejl.message];

  if (fejl.code) dele.push(`(kode ${fejl.code})`);
  if (fejl.hint) dele.push(`Tip: ${fejl.hint}`);

  return dele.join(" ");
}

// Adminfladens læsning returnerer fejlen frem for at sluge den.
//
// Den offentlige skærm falder med vilje tilbage til Grøn, når noget går galt —
// den har ingen at fortælle det til. Adminfladen har, og en tom liste, der i
// virkeligheden var en fejl, ser ud som om der bare ikke er planlagt noget.
export async function getUpcomingPlan(
  client: SupabaseClient,
  days = 14
): Promise<{ raekker: UgeplanRow[]; fejl: string | null }> {
  const { data, error } = await client
    .from("infoskaerm_ugeplan")
    .select(KOLONNER)
    .gte("dato", todayKey())
    .order("dato", { ascending: true })
    .limit(days);

  if (error) {
    console.error("infoskaerm_ugeplan liste-fejl:", error);
    return { raekker: [], fejl: beskrivSupabaseFejl(error) };
  }

  return {
    raekker: Array.isArray(data) ? data.filter(erUgeplanRow) : [],
    fejl: null,
  };
}
