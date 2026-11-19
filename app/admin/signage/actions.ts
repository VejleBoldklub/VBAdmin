"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivFejl, manglerTabel } from "@/lib/signage/data";
import {
  BUCKET,
  ELEMENT_TYPER,
  FARVE_FORM,
  JUSTERINGER,
  MIDLERTIDIG_MAKS_MIN,
  MEDIE_MAKS_BYTES,
  MEDIE_TYPER,
  OVERGANGE,
  SLUG_FORM,
  TID_FORM,
  TILPASNINGER,
  type ElementFelter,
  type Resultat,
  type ResultatMed,
  type SkaermFelter,
} from "@/lib/signage/typer";
import { erGyldigDato } from "@/lib/infoskaerm/dato";
import type { PostgrestError } from "@supabase/supabase-js";

// Skærme Alliancen: handlingerne bag signage-portalen.
//
// Som resten af adminfladen kontrollerer hver handling selv sin adgang: en
// server action er et endepunkt, der kan rammes fra enhver rute i appen — også
// fra playeren, som med vilje ikke er bag login. Alt skrives med service_role.

const IKKE_ADGANG =
  "Du er ikke logget ind med adgang til Skærme Alliancen længere. Genindlæs siden og prøv igen.";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nej(fejl: string): { ok: false; fejl: string } {
  return { ok: false, fejl };
}

function dbFejl(handling: string, fejl: PostgrestError): { ok: false; fejl: string } {
  console.error(`Signage: kunne ikke ${handling}:`, fejl);
  if (manglerTabel(fejl)) return nej("Databasen er ikke sat op til signage endnu. Kør supabase/signage.sql i Supabase.");
  if (fejl.code === "23505") return nej("Adressen er allerede brugt af en anden skærm. Vælg en anden.");
  if (fejl.code === "23503") return nej("Mediet bruges stadig på en skærm. Fjern det fra playlisterne først.");
  return nej(`Kunne ikke ${handling}: ${beskrivFejl(fejl)}`);
}

async function adgang(): Promise<boolean> {
  return !!(await kraevAdgang("signage"));
}

function opdater(skaermId?: string) {
  revalidatePath("/admin/signage");
  if (skaermId) revalidatePath(`/admin/signage/skaerm/${skaermId}`);
}

// ---------------------------------------------------------------------------
// Kontrol af det, browseren sender
// ---------------------------------------------------------------------------

function heltal(v: unknown, min: number, maks: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= maks ? v : null;
}

function valgfriTid(v: unknown): string | null | false {
  if (v === null || v === "" || v === undefined) return null;
  return typeof v === "string" && TID_FORM.test(v) ? v : false;
}

function valgfriDato(v: unknown): string | null | false {
  if (v === null || v === "" || v === undefined) return null;
  return typeof v === "string" && erGyldigDato(v) ? v : false;
}

function tjekSkaerm(f: SkaermFelter): ResultatMed<Record<string, unknown>> {
  if (typeof f !== "object" || f === null) return nej("Ugyldige felter.");

  const navn = typeof f.navn === "string" ? f.navn.trim() : "";
  if (navn.length < 1 || navn.length > 80) return nej("Skærmen skal have et navn på højst 80 tegn.");

  const slug = typeof f.slug === "string" ? f.slug.trim() : "";
  if (!SLUG_FORM.test(slug)) {
    return nej("Adressen må kun indeholde små bogstaver, tal og bindestreg (højst 50 tegn).");
  }

  const placering = typeof f.placering === "string" ? f.placering.trim() : "";
  if (placering.length > 120) return nej("Placeringen må højst være 120 tegn.");

  if (!TILPASNINGER.includes(f.tilpasning)) return nej("Ukendt tilpasning.");
  if (!OVERGANGE.includes(f.overgang)) return nej("Ukendt overgang.");
  if (!FARVE_FORM.test(f.baggrund ?? "")) return nej("Baggrundsfarven er ikke gyldig.");

  const overgangMs = heltal(f.overgangMs, 0, 3000);
  if (overgangMs === null) return nej("Overgangen skal være mellem 0 og 3000 ms.");
  const standard = heltal(f.standardSekunder, 3, 3600);
  if (standard === null) return nej("Standardvarigheden skal være mellem 3 og 3600 sekunder.");
  const opdater = heltal(f.opdaterSekunder, 15, 3600);
  if (opdater === null) return nej("Opdateringen skal være mellem 15 og 3600 sekunder.");

  const fra = valgfriTid(f.taendFra);
  const til = valgfriTid(f.taendTil);
  if (fra === false || til === false) return nej("Tænd-tiderne er ikke gyldige.");

  return {
    ok: true,
    data: {
      navn,
      slug,
      placering,
      aktiv: f.aktiv === true,
      tilpasning: f.tilpasning,
      overgang: f.overgang,
      overgang_ms: overgangMs,
      baggrund: f.baggrund,
      standard_sekunder: standard,
      lyd: f.lyd === true,
      opdater_sekunder: opdater,
      vis_ur: f.visUr === true,
      taend_fra: fra,
      taend_til: til,
    },
  };
}

function tjekElement(f: ElementFelter): ResultatMed<Record<string, unknown>> {
  if (typeof f !== "object" || f === null) return nej("Ugyldige felter.");
  if (!ELEMENT_TYPER.includes(f.type)) return nej("Ukendt elementtype.");

  // Billede og video skal have et medie. Et tekst-slide kan have et billede
  // som baggrund. De øvrige typer bruger ikke medier.
  const kraeverMedie = f.type === "billede" || f.type === "video";
  const medieId = kraeverMedie || (f.type === "tekst" && f.medieId) ? f.medieId : null;
  if (kraeverMedie && (typeof medieId !== "string" || !UUID.test(medieId))) {
    return nej("Vælg et medie fra biblioteket.");
  }
  if (medieId !== null && (typeof medieId !== "string" || !UUID.test(medieId))) return nej("Ukendt medie.");

  const titel = typeof f.titel === "string" ? f.titel.trim() : "";
  if (titel.length > 200) return nej("Overskriften må højst være 200 tegn.");
  const tekst = typeof f.tekst === "string" ? f.tekst.trim() : "";
  if (tekst.length > 2000) return nej("Teksten må højst være 2000 tegn.");

  const url = f.type === "web" ? (typeof f.url === "string" ? f.url.trim() : "") : "";
  if (f.type === "web") {
    try {
      if (new URL(url).protocol !== "https:") throw new Error();
    } catch {
      return nej("Websiden skal have en adresse, der starter med https://");
    }
  }

  const sekunder = f.sekunder === null ? null : heltal(f.sekunder, 0, 3600);
  if (f.sekunder !== null && sekunder === null) return nej("Varigheden skal være mellem 0 og 3600 sekunder.");
  if (sekunder === 0 && f.type !== "video") return nej("Kun videoer kan vises i hele deres længde (0 sekunder).");

  if (f.tilpasning !== null && !TILPASNINGER.includes(f.tilpasning)) return nej("Ukendt tilpasning.");
  if (!FARVE_FORM.test(f.baggrund ?? "") || !FARVE_FORM.test(f.tekstfarve ?? "")) return nej("Farven er ikke gyldig.");
  if (!JUSTERINGER.includes(f.justering)) return nej("Ukendt justering.");

  const fraDato = valgfriDato(f.fraDato);
  const tilDato = valgfriDato(f.tilDato);
  if (fraDato === false || tilDato === false) return nej("Datoen er ikke gyldig.");
  if (fraDato && tilDato && fraDato > tilDato) return nej("Slutdatoen ligger før startdatoen.");

  const ugedage = Array.isArray(f.ugedage) ? [...new Set(f.ugedage)].filter((d) => heltal(d, 1, 7) !== null) : [];
  if (ugedage.length === 0) return nej("Vælg mindst én ugedag.");

  const fraTid = valgfriTid(f.fraTid);
  const tilTid = valgfriTid(f.tilTid);
  if (fraTid === false || tilTid === false) return nej("Tidspunktet er ikke gyldigt.");

  return {
    ok: true,
    data: {
      type: f.type,
      medie_id: medieId,
      titel,
      tekst,
      url,
      sekunder,
      tilpasning: f.tilpasning,
      baggrund: f.baggrund,
      tekstfarve: f.tekstfarve,
      justering: f.justering,
      aktiv: f.aktiv === true,
      fra_dato: fraDato,
      til_dato: tilDato,
      ugedage: ugedage.sort(),
      fra_tid: fraTid,
      til_tid: tilTid,
    },
  };
}

// ---------------------------------------------------------------------------
// Skærme
// ---------------------------------------------------------------------------

export async function opretSkaerm(navn: string, slug: string): Promise<ResultatMed<string>> {
  if (!(await adgang())) return nej(IKKE_ADGANG);

  const ren = tjekSkaerm({
    navn,
    slug,
    placering: "",
    aktiv: true,
    tilpasning: "contain",
    overgang: "fade",
    overgangMs: 600,
    baggrund: "#000000",
    standardSekunder: 10,
    lyd: false,
    opdaterSekunder: 60,
    visUr: false,
    taendFra: null,
    taendTil: null,
  });
  if (!ren.ok) return ren;

  const { data, error } = await supabaseAdmin.from("signage_skaerme").insert(ren.data).select("id").single();
  if (error) return dbFejl("oprette skærmen", error);

  opdater();
  return { ok: true, data: data.id as string };
}

export async function gemSkaerm(id: string, felter: SkaermFelter): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt skærm.");

  const ren = tjekSkaerm(felter);
  if (!ren.ok) return ren;

  const { error } = await supabaseAdmin.from("signage_skaerme").update(ren.data).eq("id", id);
  if (error) return dbFejl("gemme skærmen", error);

  opdater(id);
  return { ok: true };
}

export async function sletSkaerm(id: string): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt skærm.");

  const { error } = await supabaseAdmin.from("signage_skaerme").delete().eq("id", id);
  if (error) return dbFejl("slette skærmen", error);

  opdater();
  return { ok: true };
}

// Hele playlisten kopieres til en ny skærm.
export async function kopierSkaerm(id: string, navn: string, slug: string): Promise<ResultatMed<string>> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt skærm.");

  const { data: kilde, error } = await supabaseAdmin.from("signage_skaerme").select("*").eq("id", id).maybeSingle();
  if (error) return dbFejl("hente skærmen", error);
  if (!kilde) return nej("Skærmen findes ikke længere.");

  const ny = { ...kilde, navn: navn.trim(), slug: slug.trim() } as Record<string, unknown>;
  for (const k of ["id", "oprettet", "updated_at", "sidst_set"]) delete ny[k];

  if (!SLUG_FORM.test(String(ny.slug))) return nej("Adressen må kun indeholde små bogstaver, tal og bindestreg.");
  if (!String(ny.navn)) return nej("Skærmen skal have et navn.");

  const { data: oprettet, error: opretFejl } = await supabaseAdmin
    .from("signage_skaerme")
    .insert(ny)
    .select("id")
    .single();
  if (opretFejl) return dbFejl("kopiere skærmen", opretFejl);

  const { data: elementer, error: elFejl } = await supabaseAdmin
    .from("signage_elementer")
    .select("*")
    .eq("skaerm_id", id);
  if (elFejl) return dbFejl("kopiere playlisten", elFejl);

  if (elementer?.length) {
    const kopier = elementer.map((e) => {
      const k = { ...e, skaerm_id: oprettet.id } as Record<string, unknown>;
      for (const f of ["id", "oprettet", "updated_at"]) delete k[f];
      return k;
    });
    const { error: indsaetFejl } = await supabaseAdmin.from("signage_elementer").insert(kopier);
    if (indsaetFejl) return dbFejl("kopiere playlisten", indsaetFejl);
  }

  opdater();
  return { ok: true, data: oprettet.id as string };
}

// ---------------------------------------------------------------------------
// Elementer
// ---------------------------------------------------------------------------

async function naesteRaekkefoelge(skaermId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("signage_elementer")
    .select("raekkefoelge")
    .eq("skaerm_id", skaermId)
    .order("raekkefoelge", { ascending: false })
    .limit(1)
    .maybeSingle();
  return typeof data?.raekkefoelge === "number" ? data.raekkefoelge + 1 : 0;
}

export async function opretElement(skaermId: string, felter: ElementFelter): Promise<ResultatMed<string>> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(skaermId)) return nej("Ukendt skærm.");

  const ren = tjekElement(felter);
  if (!ren.ok) return ren;

  const raekkefoelge = await naesteRaekkefoelge(skaermId);

  const { data, error } = await supabaseAdmin
    .from("signage_elementer")
    .insert({ ...ren.data, skaerm_id: skaermId, raekkefoelge })
    .select("id")
    .single();
  if (error) return dbFejl("tilføje elementet", error);

  opdater(skaermId);
  return { ok: true, data: data.id as string };
}

export async function gemElement(id: string, felter: ElementFelter): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt element.");

  const ren = tjekElement(felter);
  if (!ren.ok) return ren;

  const { data, error } = await supabaseAdmin
    .from("signage_elementer")
    .update(ren.data)
    .eq("id", id)
    .select("skaerm_id")
    .maybeSingle();
  if (error) return dbFejl("gemme elementet", error);

  opdater(data?.skaerm_id as string | undefined);
  return { ok: true };
}

export async function saetElementAktiv(id: string, aktiv: boolean): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id) || typeof aktiv !== "boolean") return nej("Ukendt element.");

  const { data, error } = await supabaseAdmin
    .from("signage_elementer")
    .update({ aktiv })
    .eq("id", id)
    .select("skaerm_id")
    .maybeSingle();
  if (error) return dbFejl("gemme elementet", error);

  opdater(data?.skaerm_id as string | undefined);
  return { ok: true };
}

export async function sletElement(id: string): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt element.");

  const { data, error } = await supabaseAdmin
    .from("signage_elementer")
    .delete()
    .eq("id", id)
    .select("skaerm_id")
    .maybeSingle();
  if (error) return dbFejl("slette elementet", error);

  opdater(data?.skaerm_id as string | undefined);
  return { ok: true };
}

// Et element kopieres til en skærm — den samme (dublet) eller en anden.
export async function kopierElement(id: string, tilSkaermId: string): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id) || !UUID.test(tilSkaermId)) return nej("Ukendt element eller skærm.");

  const { data: kilde, error } = await supabaseAdmin.from("signage_elementer").select("*").eq("id", id).maybeSingle();
  if (error) return dbFejl("hente elementet", error);
  if (!kilde) return nej("Elementet findes ikke længere.");

  const kopi = { ...kilde, skaerm_id: tilSkaermId, raekkefoelge: await naesteRaekkefoelge(tilSkaermId) } as Record<
    string,
    unknown
  >;
  for (const f of ["id", "oprettet", "updated_at"]) delete kopi[f];

  const { error: indsaetFejl } = await supabaseAdmin.from("signage_elementer").insert(kopi);
  if (indsaetFejl) return dbFejl("kopiere elementet", indsaetFejl);

  opdater(kilde.skaerm_id as string);
  opdater(tilSkaermId);
  return { ok: true };
}

export async function gemRaekkefoelge(skaermId: string, ider: string[]): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(skaermId)) return nej("Ukendt skærm.");
  if (!Array.isArray(ider) || ider.length > 500 || !ider.every((id) => typeof id === "string" && UUID.test(id))) {
    return nej("Rækkefølgen kunne ikke gemmes.");
  }

  for (const [raekkefoelge, id] of ider.entries()) {
    const { error } = await supabaseAdmin
      .from("signage_elementer")
      .update({ raekkefoelge })
      .eq("id", id)
      .eq("skaerm_id", skaermId);
    if (error) return dbFejl("gemme rækkefølgen", error);
  }

  opdater(skaermId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mediebiblioteket
// ---------------------------------------------------------------------------

// Videoer er for store til at gå gennem en server action (Vercel stopper ved
// 4,5 MB). Browseren lægger derfor filen direkte i Storage med en signeret
// upload-URL, som kun udstedes her — efter adgangskontrollen. Bagefter
// registreres filen med registrerMedie.
export async function forberedUpload(
  mime: string,
  bytes: number
): Promise<ResultatMed<{ sti: string; signedUrl: string }>> {
  if (!(await adgang())) return nej(IKKE_ADGANG);

  const type = MEDIE_TYPER[mime];
  if (!type) return nej("Filtypen understøttes ikke. Brug JPEG, PNG, WebP, GIF, MP4 eller WebM.");
  if (!Number.isFinite(bytes) || bytes <= 0) return nej("Filen er tom.");
  if (bytes > MEDIE_MAKS_BYTES) return nej("Filen er større end 500 MB.");

  const endelse = mime.split("/")[1].replace("jpeg", "jpg");
  const sti = `${type === "video" ? "videoer" : "billeder"}/${crypto.randomUUID()}.${endelse}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(sti);
  if (error || !data) {
    console.error("Signage: kunne ikke udstede upload-URL:", error);
    return nej(
      `Upload kunne ikke startes: ${error?.message ?? "ukendt fejl"}. Findes bucketen ikke, mangler supabase/signage.sql at blive kørt.`
    );
  }

  return { ok: true, data: { sti, signedUrl: data.signedUrl } };
}

export async function registrerMedie(sti: string, navn: string): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);

  const m = /^(billeder|videoer)\/([0-9a-f-]{36}\.[a-z0-9]+)$/.exec(sti);
  if (!m) return nej("Ukendt fil.");

  // Filen slås op i Storage frem for at tro på browserens oplysninger om den.
  const { data: liste, error } = await supabaseAdmin.storage.from(BUCKET).list(m[1], { search: m[2], limit: 1 });
  const fil = liste?.find((f) => f.name === m[2]);
  if (error || !fil) {
    console.error("Signage: uploadet fil blev ikke fundet:", error);
    return nej("Filen blev ikke fundet i Storage efter upload. Prøv igen.");
  }

  const meta = (fil.metadata ?? {}) as { mimetype?: string; size?: number };
  const mime = meta.mimetype ?? "";
  const type = MEDIE_TYPER[mime];
  if (!type) {
    await supabaseAdmin.storage.from(BUCKET).remove([sti]);
    return nej("Filtypen understøttes ikke.");
  }

  const rentNavn = (typeof navn === "string" ? navn.trim() : "").slice(0, 160) || "Unavngivet";

  const { error: indsaetFejl } = await supabaseAdmin
    .from("signage_medier")
    .insert({ navn: rentNavn, type, sti, mime, bytes: meta.size ?? 0 });

  if (indsaetFejl) {
    await supabaseAdmin.storage.from(BUCKET).remove([sti]);
    return dbFejl("gemme mediet", indsaetFejl);
  }

  revalidatePath("/admin/signage/medier");
  return { ok: true };
}

export async function omdoebMedie(id: string, navn: string): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt medie.");

  const rent = typeof navn === "string" ? navn.trim() : "";
  if (rent.length < 1 || rent.length > 160) return nej("Navnet skal være mellem 1 og 160 tegn.");

  const { error } = await supabaseAdmin.from("signage_medier").update({ navn: rent }).eq("id", id);
  if (error) return dbFejl("omdøbe mediet", error);

  revalidatePath("/admin/signage/medier");
  return { ok: true };
}

export async function sletMedie(id: string): Promise<Resultat> {
  if (!(await adgang())) return nej(IKKE_ADGANG);
  if (!UUID.test(id)) return nej("Ukendt medie.");

  // Rækken først. Er mediet i brug, afviser databasen sletningen, og filen
  // bliver liggende urørt.
  const { data, error } = await supabaseAdmin
    .from("signage_medier")
    .delete()
    .eq("id", id)
    .select("sti")
    .maybeSingle();
  if (error) return dbFejl("slette mediet", error);

  if (typeof data?.sti === "string") {
    const { error: fjernFejl } = await supabaseAdmin.storage.from(BUCKET).remove([data.sti]);
    if (fjernFejl) console.error("Signage: filen kunne ikke fjernes fra Storage:", fjernFejl);
  }

  revalidatePath("/admin/signage/medier");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Midlertidig visning
//
// Ét element vises alene på skærmen i et valgt tidsrum og afløses derefter af
// playlisten igen. Elementet skal høre til skærmen, men må gerne være slået fra
// i playlisten, så man kan lave en test uden at den kører fast.
// ---------------------------------------------------------------------------

export async function startMidlertidig(skaermId: string, elementId: string, minutter: number): Promise<Resultat> {
  if (!(await kraevAdgang("signage"))) return nej(IKKE_ADGANG);
  if (!UUID.test(skaermId) || !UUID.test(elementId)) return nej("Ukendt skærm eller element.");
  if (!Number.isInteger(minutter) || minutter < 1 || minutter > MIDLERTIDIG_MAKS_MIN) {
    return nej("Vælg en varighed mellem 1 minut og 31 dage.");
  }

  const { data: el, error: elFejl } = await supabaseAdmin
    .from("signage_elementer")
    .select("id, skaerm_id")
    .eq("id", elementId)
    .maybeSingle();
  if (elFejl) return nej(beskrivFejl(elFejl));
  if (!el || el.skaerm_id !== skaermId) return nej("Elementet hører ikke til denne skærm.");

  const til = new Date(Date.now() + minutter * 60_000).toISOString();
  const { error } = await supabaseAdmin
    .from("signage_skaerme")
    .update({ midlertidig_element_id: elementId, midlertidig_til: til })
    .eq("id", skaermId);
  if (error) {
    console.error("Signage: kunne ikke starte midlertidig visning:", error);
    return nej(`Kunne ikke starte: ${beskrivFejl(error)}`);
  }

  genopfriskMidlertidig(skaermId);
  return { ok: true };
}

export async function stopMidlertidig(skaermId: string): Promise<Resultat> {
  if (!(await kraevAdgang("signage"))) return nej(IKKE_ADGANG);
  if (!UUID.test(skaermId)) return nej("Ukendt skærm.");

  const { error } = await supabaseAdmin
    .from("signage_skaerme")
    .update({ midlertidig_element_id: null, midlertidig_til: null })
    .eq("id", skaermId);
  if (error) {
    console.error("Signage: kunne ikke stoppe midlertidig visning:", error);
    return nej(`Kunne ikke stoppe: ${beskrivFejl(error)}`);
  }

  genopfriskMidlertidig(skaermId);
  return { ok: true };
}

function genopfriskMidlertidig(skaermId: string) {
  revalidatePath("/admin/signage");
  revalidatePath(`/admin/signage/skaerm/${skaermId}`);
  revalidatePath("/admin/signage/studio");
  revalidatePath("/admin/signage/enkel");
  revalidatePath("/infoskaerm/cafeteria");
}
