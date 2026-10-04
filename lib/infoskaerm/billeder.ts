import type { SupabaseClient } from "@supabase/supabase-js";
import { beskrivSupabaseFejl, todayKey } from "./data";

// Billederne og skærmens opsætning.
//
// Som resten af lib/infoskaerm sendes klienten ind af kaldstedet: skærmen læser
// med anon-nøglen bag rækkesikkerheden, adminfladen med service_role.
// Tabellerne står i supabase/infoskaerm-billeder.sql.

export const BUCKET = "infoskaerm";

export const LAYOUTS = ["kost", "side", "skift"] as const;
export type Layout = (typeof LAYOUTS)[number];

export const SEKUNDER_MIN = 5;
export const SEKUNDER_MAKS = 300;

export type Opsaetning = { layout: Layout; sekunder: number };

// Skærmen ser ud som før billederne, hvis opsætningen ikke kan hentes. Det er
// den visning, alle kender, og den kræver ingen billeder for at give mening.
export const STANDARD_OPSAETNING: Opsaetning = { layout: "kost", sekunder: 15 };

// Det, skærmen skal bruge: en adresse og en tekst.
export type SkaermBillede = { id: string; url: string; tekst: string };

// Det, adminfladen skal bruge oveni.
export type AdminBillede = SkaermBillede & {
  sti: string;
  visDato: string | null;
  aktiv: boolean;
  raekkefoelge: number;
};

export function erLayout(vaerdi: unknown): vaerdi is Layout {
  return typeof vaerdi === "string" && LAYOUTS.some((l) => l === vaerdi);
}

export function erOpsaetning(vaerdi: unknown): vaerdi is Opsaetning {
  if (typeof vaerdi !== "object" || vaerdi === null) return false;

  const o = vaerdi as Record<string, unknown>;

  return (
    erLayout(o.layout) &&
    typeof o.sekunder === "number" &&
    Number.isInteger(o.sekunder) &&
    o.sekunder >= SEKUNDER_MIN &&
    o.sekunder <= SEKUNDER_MAKS
  );
}

export function erSkaermBillede(vaerdi: unknown): vaerdi is SkaermBillede {
  if (typeof vaerdi !== "object" || vaerdi === null) return false;

  const b = vaerdi as Record<string, unknown>;

  return typeof b.id === "string" && typeof b.url === "string" && typeof b.tekst === "string";
}

const KOLONNER = "id, sti, tekst, vis_dato, aktiv, raekkefoelge";

type Raekke = {
  id: string;
  sti: string;
  tekst: string;
  vis_dato: string | null;
  aktiv: boolean;
  raekkefoelge: number;
};

function erRaekke(vaerdi: unknown): vaerdi is Raekke {
  if (typeof vaerdi !== "object" || vaerdi === null) return false;

  const r = vaerdi as Record<string, unknown>;

  return (
    typeof r.id === "string" &&
    typeof r.sti === "string" &&
    typeof r.tekst === "string" &&
    (r.vis_dato === null || typeof r.vis_dato === "string") &&
    typeof r.aktiv === "boolean" &&
    typeof r.raekkefoelge === "number"
  );
}

// Adressen regnes ud lokalt — getPublicUrl spørger ikke Supabase, den bygger
// blot strengen. Bucketen er offentlig, så adressen virker uden nøgle.
function url(client: SupabaseClient, sti: string): string {
  return client.storage.from(BUCKET).getPublicUrl(sti).data.publicUrl;
}

// Dagens billeder til skærmen: dem uden dato og dem med dagens dato.
//
// En fejl giver en tom liste, ikke en fejlside. Skærmen står uden opsyn, og
// uden billeder kan den stadig vise kostplanen.
export async function getDagensBilleder(client: SupabaseClient): Promise<SkaermBillede[]> {
  const { data, error } = await client
    .from("infoskaerm_billeder")
    .select(KOLONNER)
    .eq("aktiv", true)
    .or(`vis_dato.is.null,vis_dato.eq.${todayKey()}`)
    .order("raekkefoelge", { ascending: true })
    .order("oprettet", { ascending: true });

  if (error) {
    console.error("infoskaerm_billeder fetch fejl:", error);
    return [];
  }

  return (Array.isArray(data) ? data : [])
    .filter(erRaekke)
    .map((r) => ({ id: r.id, url: url(client, r.sti), tekst: r.tekst }));
}

export async function getOpsaetning(client: SupabaseClient): Promise<Opsaetning> {
  const { data, error } = await client
    .from("infoskaerm_opsaetning")
    .select("layout, sekunder")
    .maybeSingle();

  if (error) {
    console.error("infoskaerm_opsaetning fetch fejl:", error);
    return STANDARD_OPSAETNING;
  }

  return erOpsaetning(data) ? data : STANDARD_OPSAETNING;
}

// Adminfladens udgave returnerer fejlen frem for at sluge den, af samme grund
// som getUpcomingPlan: en tom liste, der i virkeligheden var en manglende
// tabel, ligner bare en skærm uden billeder.
export async function getAlleBilleder(
  client: SupabaseClient
): Promise<{ billeder: AdminBillede[]; fejl: string | null }> {
  const { data, error } = await client
    .from("infoskaerm_billeder")
    .select(KOLONNER)
    .order("raekkefoelge", { ascending: true })
    .order("oprettet", { ascending: true });

  if (error) {
    console.error("infoskaerm_billeder liste-fejl:", error);
    return { billeder: [], fejl: beskrivSupabaseFejl(error) };
  }

  const billeder = (Array.isArray(data) ? data : []).filter(erRaekke).map((r) => ({
    id: r.id,
    url: url(client, r.sti),
    tekst: r.tekst,
    sti: r.sti,
    visDato: r.vis_dato,
    aktiv: r.aktiv,
    raekkefoelge: r.raekkefoelge,
  }));

  return { billeder, fejl: null };
}

export async function getOpsaetningTilAdmin(
  client: SupabaseClient
): Promise<{ opsaetning: Opsaetning; fejl: string | null }> {
  const { data, error } = await client
    .from("infoskaerm_opsaetning")
    .select("layout, sekunder")
    .maybeSingle();

  if (error) {
    console.error("infoskaerm_opsaetning admin-fejl:", error);
    return { opsaetning: STANDARD_OPSAETNING, fejl: beskrivSupabaseFejl(error) };
  }

  return { opsaetning: erOpsaetning(data) ? data : STANDARD_OPSAETNING, fejl: null };
}
