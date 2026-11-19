import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  BUCKET,
  type Element,
  type ElementType,
  type Justering,
  CAFETERIA_SLUG,
  type Medie,
  type Midlertidig,
  midlertidigAktiv,
  type Overgang,
  type PlayerData,
  type PlayerElement,
  type Skaerm,
  type Tilpasning,
} from "./typer";

// Læsning af signage-tabellerne.
//
// Klienten sendes ind af kaldstedet, som i lib/infoskaerm: playeren læser med
// anon-nøglen bag rækkesikkerheden, adminfladen med service_role. Modulet er
// ikke "use server" — det returnerer data, og hver eksport i et "use server"-
// modul ville blive et endepunkt.

export function beskrivFejl(fejl: PostgrestError): string {
  const dele = [fejl.message];
  if (fejl.code) dele.push(`(kode ${fejl.code})`);
  if (fejl.hint) dele.push(`Tip: ${fejl.hint}`);
  return dele.join(" ");
}

// Tabellen findes ikke: migrationen er ikke kørt endnu.
export function manglerTabel(fejl: PostgrestError | null): boolean {
  return fejl?.code === "42P01" || fejl?.code === "PGRST205";
}

const SKAERM_FELTER =
  "id, navn, slug, placering, aktiv, tilpasning, overgang, overgang_ms, baggrund, standard_sekunder, lyd, opdater_sekunder, vis_ur, taend_fra, taend_til, sidst_set, midlertidig_element_id, midlertidig_til";

const ELEMENT_FELTER =
  "id, skaerm_id, type, medie_id, titel, tekst, url, sekunder, tilpasning, baggrund, tekstfarve, justering, raekkefoelge, aktiv, fra_dato, til_dato, ugedage, fra_tid, til_tid";

type Raekke = Record<string, unknown>;

// "08:30:00" fra databasen bliver til "08:30".
function tid(v: unknown): string | null {
  return typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : null;
}

function tekst(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function tilSkaerm(r: Raekke): Skaerm {
  return {
    id: tekst(r.id),
    navn: tekst(r.navn),
    slug: tekst(r.slug),
    placering: tekst(r.placering),
    aktiv: r.aktiv !== false,
    tilpasning: (r.tilpasning === "cover" ? "cover" : "contain") as Tilpasning,
    overgang: (["ingen", "fade", "slide"].includes(tekst(r.overgang)) ? r.overgang : "fade") as Overgang,
    overgangMs: Number(r.overgang_ms ?? 600),
    baggrund: tekst(r.baggrund) || "#000000",
    standardSekunder: Number(r.standard_sekunder ?? 10),
    lyd: r.lyd === true,
    opdaterSekunder: Number(r.opdater_sekunder ?? 60),
    visUr: r.vis_ur === true,
    taendFra: tid(r.taend_fra),
    taendTil: tid(r.taend_til),
    sidstSet: typeof r.sidst_set === "string" ? r.sidst_set : null,
    midlertidigElementId: typeof r.midlertidig_element_id === "string" ? r.midlertidig_element_id : null,
    midlertidigTil: typeof r.midlertidig_til === "string" ? r.midlertidig_til : null,
  };
}

export function tilElement(r: Raekke): Element {
  return {
    id: tekst(r.id),
    skaermId: tekst(r.skaerm_id),
    type: tekst(r.type) as ElementType,
    medieId: typeof r.medie_id === "string" ? r.medie_id : null,
    titel: tekst(r.titel),
    tekst: tekst(r.tekst),
    url: tekst(r.url),
    sekunder: typeof r.sekunder === "number" ? r.sekunder : null,
    tilpasning: r.tilpasning === "cover" || r.tilpasning === "contain" ? r.tilpasning : null,
    baggrund: tekst(r.baggrund) || "#b91c1c",
    tekstfarve: tekst(r.tekstfarve) || "#ffffff",
    justering: (r.justering === "venstre" ? "venstre" : "center") as Justering,
    raekkefoelge: Number(r.raekkefoelge ?? 0),
    aktiv: r.aktiv !== false,
    fraDato: typeof r.fra_dato === "string" ? r.fra_dato : null,
    tilDato: typeof r.til_dato === "string" ? r.til_dato : null,
    ugedage: Array.isArray(r.ugedage) ? r.ugedage.map(Number) : [1, 2, 3, 4, 5, 6, 7],
    fraTid: tid(r.fra_tid),
    tilTid: tid(r.til_tid),
  };
}

export function medieUrl(client: SupabaseClient, sti: string): string {
  return client.storage.from(BUCKET).getPublicUrl(sti).data.publicUrl;
}

function tilMedie(client: SupabaseClient, r: Raekke): Medie {
  const sti = tekst(r.sti);
  return {
    id: tekst(r.id),
    navn: tekst(r.navn),
    type: r.type === "video" ? "video" : "billede",
    sti,
    mime: tekst(r.mime),
    bytes: Number(r.bytes ?? 0),
    url: medieUrl(client, sti),
    oprettet: tekst(r.oprettet),
  };
}

export async function hentSkaerme(
  client: SupabaseClient
): Promise<{ skaerme: Skaerm[]; antal: Record<string, number>; fejl: PostgrestError | null }> {
  const { data, error } = await client.from("signage_skaerme").select(SKAERM_FELTER).order("navn");
  if (error) return { skaerme: [], antal: {}, fejl: error };

  const { data: el } = await client.from("signage_elementer").select("skaerm_id").eq("aktiv", true);
  const antal: Record<string, number> = {};
  for (const r of el ?? []) antal[r.skaerm_id as string] = (antal[r.skaerm_id as string] ?? 0) + 1;

  return { skaerme: (data ?? []).map(tilSkaerm), antal, fejl: null };
}

export async function hentSkaerm(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("signage_skaerme").select(SKAERM_FELTER).eq("id", id).maybeSingle();
  return { skaerm: data ? tilSkaerm(data) : null, fejl: error };
}

export async function hentElementer(client: SupabaseClient, skaermId: string) {
  const { data, error } = await client
    .from("signage_elementer")
    .select(ELEMENT_FELTER)
    .eq("skaerm_id", skaermId)
    .order("raekkefoelge")
    .order("oprettet");
  return { elementer: (data ?? []).map(tilElement), fejl: error };
}

export async function hentMedier(client: SupabaseClient) {
  const { data, error } = await client
    .from("signage_medier")
    .select("id, navn, type, sti, mime, bytes, oprettet")
    .order("oprettet", { ascending: false });
  return { medier: (data ?? []).map((r) => tilMedie(client, r)), fejl: error };
}

// Hvor mange elementer hvert medie indgår i, på tværs af skærme.
export async function hentMedieBrug(client: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await client.from("signage_elementer").select("medie_id").not("medie_id", "is", null);
  const brug: Record<string, number> = {};
  for (const r of data ?? []) brug[r.medie_id as string] = (brug[r.medie_id as string] ?? 0) + 1;
  return brug;
}

// Alt, en skærm skal bruge. Planlægningen afgøres i playeren, ikke her, så
// tidsvinduer slår igennem til tiden også mellem to hentninger.
export async function hentPlayerData(client: SupabaseClient, slug: string): Promise<PlayerData | null> {
  const { data: s, error } = await client.from("signage_skaerme").select(SKAERM_FELTER).eq("slug", slug).maybeSingle();
  if (error) throw new Error(beskrivFejl(error));
  if (!s) return null;

  const skaerm = tilSkaerm(s);

  const { data: el, error: elFejl } = await client
    .from("signage_elementer")
    .select(ELEMENT_FELTER)
    .eq("skaerm_id", skaerm.id)
    .eq("aktiv", true)
    .order("raekkefoelge")
    .order("oprettet");
  if (elFejl) throw new Error(beskrivFejl(elFejl));

  const elementer = (el ?? []).map(tilElement);

  // Den midlertidige visning må gerne være et element, der er slået fra i
  // playlisten — fx en test, der ikke skal køre fast.
  let midlertidigt: Element | null = null;
  if (skaerm.midlertidigElementId && midlertidigAktiv(skaerm.midlertidigTil, Date.now())) {
    midlertidigt = elementer.find((e) => e.id === skaerm.midlertidigElementId) ?? null;
    if (!midlertidigt) {
      const { data: m } = await client
        .from("signage_elementer")
        .select(ELEMENT_FELTER)
        .eq("id", skaerm.midlertidigElementId)
        .maybeSingle();
      midlertidigt = m ? tilElement(m) : null;
    }
  }

  const ider = [...new Set([...elementer, ...(midlertidigt ? [midlertidigt] : [])].map((e) => e.medieId).filter((id): id is string => !!id))];

  const medier = new Map<string, Medie>();
  if (ider.length) {
    const { data: m, error: mFejl } = await client
      .from("signage_medier")
      .select("id, navn, type, sti, mime, bytes, oprettet")
      .in("id", ider);
    if (mFejl) throw new Error(beskrivFejl(mFejl));
    for (const r of m ?? []) {
      const medie = tilMedie(client, r);
      medier.set(medie.id, medie);
    }
  }

  const tilPlayer = (e: Element): PlayerElement => {
    const m = e.medieId ? medier.get(e.medieId) : undefined;
    return { ...e, medieUrl: m?.url ?? null, medieType: m?.type ?? null };
  };
  // Et billede- eller videoelement uden fil har intet at vise.
  const kanVises = (e: PlayerElement) => (e.type === "billede" || e.type === "video" ? !!e.medieUrl : true);

  const playerElementer = elementer.map(tilPlayer).filter(kanVises);
  const midlertidig = midlertidigt ? tilPlayer(midlertidigt) : null;

  return { skaerm, elementer: playerElementer, midlertidig: midlertidig && kanVises(midlertidig) ? midlertidig : null };
}

// Midlertidig visning til /infoskaerm/cafeteria, hvis skærmen "cafeteria" i
// Skærme Alliancen har en kørende. Infoskærm-elementer springes over: de ville
// bare vise infoskærmen inde i sig selv. Fejl giver null, så infoskærmen altid
// kan vise sig selv, selv hvis signage-tabellerne driller.
export async function hentInfoskaermMidlertidig(client: SupabaseClient): Promise<Midlertidig | null> {
  try {
    const data = await hentPlayerData(client, CAFETERIA_SLUG);
    const m = data?.midlertidig;
    if (!data || !m || m.type === "infoskaerm" || !data.skaerm.midlertidigTil) return null;
    return {
      element: m,
      til: data.skaerm.midlertidigTil,
      tilpasning: data.skaerm.tilpasning,
      lyd: data.skaerm.lyd,
      baggrund: data.skaerm.baggrund,
    };
  } catch (err) {
    console.error("Signage: midlertidig visning til infoskærmen kunne ikke hentes:", err);
    return null;
  }
}
