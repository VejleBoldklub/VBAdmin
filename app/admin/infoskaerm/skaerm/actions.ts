"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";
import { erGyldigDato } from "@/lib/infoskaerm/dato";
import { BUCKET, erLayout, SEKUNDER_MAKS, SEKUNDER_MIN } from "@/lib/infoskaerm/billeder";
import type { GemResultat } from "@/lib/infoskaerm/types";
import { billedtype, FIL_MAKS } from "@/lib/infoskaerm/billedtype";

// Skærmens opsætning og billederne.
//
// Som ugeplanens og indholdets handlinger kontrollerer hver handling selv sin
// adgang: en server action er et endepunkt, der kan rammes fra enhver rute i
// appen — også fra skærmsiden, som med vilje ikke er bag login. Skrivningen sker
// med service_role, både i tabellerne og i Storage.

const ADMIN_STI = "/admin/infoskaerm/skaerm";
const SKAERM_STI = "/infoskaerm/cafeteria";

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";

const TEKST_MAKS = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function opdater() {
  revalidatePath(ADMIN_STI);
  revalidatePath(SKAERM_STI);
}

function nej(fejl: string): GemResultat {
  return { ok: false, fejl };
}

export async function gemOpsaetning(layout: string, sekunder: number): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at ændre infoskærmens opsætning uden gyldig adgang.");
    return nej(IKKE_ADMIN);
  }

  if (!erLayout(layout)) return nej("Ukendt opsætning.");

  if (!Number.isInteger(sekunder) || sekunder < SEKUNDER_MIN || sekunder > SEKUNDER_MAKS) {
    return nej(`Tiden skal være mellem ${SEKUNDER_MIN} og ${SEKUNDER_MAKS} sekunder.`);
  }

  const { error } = await supabaseAdmin
    .from("infoskaerm_opsaetning")
    .upsert({ id: true, layout, sekunder }, { onConflict: "id" });

  if (error) {
    console.error("Kunne ikke gemme infoskærmens opsætning:", error);
    return nej(`Kunne ikke gemme: ${beskrivSupabaseFejl(error)}`);
  }

  opdater();
  return { ok: true };
}

function laesTekst(vaerdi: FormDataEntryValue | null): string | null {
  const tekst = typeof vaerdi === "string" ? vaerdi.trim() : "";
  return tekst.length > TEKST_MAKS ? null : tekst;
}

// Tom streng betyder "hver dag". Alt andet skal være en rigtig dato.
function laesDato(vaerdi: FormDataEntryValue | null): string | null | false {
  const dato = typeof vaerdi === "string" ? vaerdi.trim() : "";
  if (dato === "") return null;
  return erGyldigDato(dato) ? dato : false;
}

export async function lagBilledOp(formular: FormData): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at lægge et billede på infoskærmen uden gyldig adgang.");
    return nej(IKKE_ADMIN);
  }

  const fil = formular.get("fil");
  if (!(fil instanceof File) || fil.size === 0) return nej("Vælg et billede.");
  if (fil.size > FIL_MAKS) return nej("Billedet er for stort. Prøv et mindre billede.");

  const tekst = laesTekst(formular.get("tekst"));
  if (tekst === null) return nej(`Teksten må højst være ${TEKST_MAKS} tegn.`);

  const visDato = laesDato(formular.get("visDato"));
  if (visDato === false) return nej("Datoen er ikke gyldig.");

  const bytes = new Uint8Array(await fil.arrayBuffer());
  const type = billedtype(bytes);
  if (!type) return nej("Filen er ikke et billede, skærmen kan vise (JPEG, PNG eller WebP).");

  const sti = `${crypto.randomUUID()}.${type.endelse}`;

  const { error: uploadFejl } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(sti, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });

  if (uploadFejl) {
    console.error("Kunne ikke lægge billede i Storage:", uploadFejl);
    return nej(
      `Billedet kunne ikke gemmes: ${uploadFejl.message}. Findes bucketen ikke, mangler ` +
        "supabase/infoskaerm-billeder.sql at blive kørt."
    );
  }

  // Nye billeder lægges sidst i rækken.
  const { data: sidste } = await supabaseAdmin
    .from("infoskaerm_billeder")
    .select("raekkefoelge")
    .order("raekkefoelge", { ascending: false })
    .limit(1)
    .maybeSingle();

  const raekkefoelge = typeof sidste?.raekkefoelge === "number" ? sidste.raekkefoelge + 1 : 0;

  const { error } = await supabaseAdmin
    .from("infoskaerm_billeder")
    .insert({ sti, tekst, vis_dato: visDato, raekkefoelge });

  if (error) {
    console.error("Kunne ikke gemme billedrække:", error);

    // Filen fjernes igen. Uden en række er den ikke til at finde fra
    // adminfladen og ville blot ligge og fylde.
    await supabaseAdmin.storage.from(BUCKET).remove([sti]);

    return nej(`Kunne ikke gemme: ${beskrivSupabaseFejl(error)}`);
  }

  opdater();
  return { ok: true };
}

export async function opdaterBillede(
  id: string,
  felter: { tekst: string; visDato: string; aktiv: boolean }
): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at ændre et billede på infoskærmen uden gyldig adgang.");
    return nej(IKKE_ADMIN);
  }

  if (!UUID.test(id)) return nej("Ukendt billede.");
  if (typeof felter?.aktiv !== "boolean") return nej("Ukendt billede.");

  const tekst = laesTekst(felter.tekst);
  if (tekst === null) return nej(`Teksten må højst være ${TEKST_MAKS} tegn.`);

  const visDato = laesDato(felter.visDato);
  if (visDato === false) return nej("Datoen er ikke gyldig.");

  const { error } = await supabaseAdmin
    .from("infoskaerm_billeder")
    .update({ tekst, vis_dato: visDato, aktiv: felter.aktiv })
    .eq("id", id);

  if (error) {
    console.error("Kunne ikke opdatere billede:", error);
    return nej(`Kunne ikke gemme: ${beskrivSupabaseFejl(error)}`);
  }

  opdater();
  return { ok: true };
}

// Hele rækkefølgen sendes på én gang: listen, som den står på siden efter en
// flytning. Hvert billede får sin plads som tal, så to ikke kan ende med samme.
export async function gemRaekkefoelge(ider: string[]): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at ændre billedernes rækkefølge uden gyldig adgang.");
    return nej(IKKE_ADMIN);
  }

  if (!Array.isArray(ider) || ider.length > 500 || !ider.every((id) => UUID.test(id))) {
    return nej("Rækkefølgen kunne ikke gemmes.");
  }

  for (const [raekkefoelge, id] of ider.entries()) {
    const { error } = await supabaseAdmin
      .from("infoskaerm_billeder")
      .update({ raekkefoelge })
      .eq("id", id);

    if (error) {
      console.error("Kunne ikke gemme rækkefølge:", error);
      return nej(`Kunne ikke gemme: ${beskrivSupabaseFejl(error)}`);
    }
  }

  opdater();
  return { ok: true };
}

export async function sletBillede(id: string): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at slette et billede fra infoskærmen uden gyldig adgang.");
    return nej(IKKE_ADMIN);
  }

  if (!UUID.test(id)) return nej("Ukendt billede.");

  // Rækken slettes før filen. Går det galt midt imellem, ligger der en fil uden
  // række, som ingen ser — frem for en række, der viser et brudt billede på
  // skærmen.
  const { data, error } = await supabaseAdmin
    .from("infoskaerm_billeder")
    .delete()
    .eq("id", id)
    .select("sti")
    .maybeSingle();

  if (error) {
    console.error("Kunne ikke slette billede:", error);
    return nej(`Kunne ikke slette: ${beskrivSupabaseFejl(error)}`);
  }

  if (typeof data?.sti === "string") {
    const { error: fjernFejl } = await supabaseAdmin.storage.from(BUCKET).remove([data.sti]);
    if (fjernFejl) console.error("Billedfilen kunne ikke fjernes fra Storage:", fjernFejl);
  }

  opdater();
  return { ok: true };
}
