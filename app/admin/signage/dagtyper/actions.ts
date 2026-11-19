"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl, findesDagtype, todayKey } from "@/lib/infoskaerm/data";
import {
  erIndholdRow,
  erStandardDagtype,
  fraDagIndhold,
  standardIndhold,
} from "@/lib/infoskaerm/content";
import type { Resultat } from "@/lib/signage/typer";

// Oprettelse, omdøbning og sletning af dagtyper (fx "Rød 2").
//
// En dagtype er en række i infoskaerm_indhold. Ugeplanen og designs peger på
// den med en fremmednøgle, der følger med ved omdøbning. Rød, Gul og Grøn er
// faste og kan hverken omdøbes eller slettes: skærmen falder tilbage til dem.

const NAVN_MAKS = 30;
const IKKE_ADMIN = "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";

async function harAdgang(): Promise<boolean> {
  return (await kraevAdgang("signage")) !== null || (await kraevAdgang("infoskaerm")) !== null;
}

function rensNavn(navn: unknown): string | null {
  if (typeof navn !== "string") return null;
  const ren = navn.trim().replace(/\s+/g, " ");
  if (ren === "" || ren.length > NAVN_MAKS) return null;
  return ren;
}

function genopfrisk() {
  revalidatePath("/admin/signage/dagtyper");
  revalidatePath("/admin/signage/dagens-farve");
  revalidatePath("/admin/infoskaerm");
  revalidatePath("/admin/infoskaerm/indhold");
  revalidatePath("/admin/infoskaerm/design");
  revalidatePath("/infoskaerm/cafeteria");
}

export async function opretDagtype(navn: string, kopierFra: string): Promise<Resultat> {
  if (!(await harAdgang())) return { ok: false, fejl: IKKE_ADMIN };

  const ren = rensNavn(navn);
  if (!ren) return { ok: false, fejl: `Navnet skal være 1-${NAVN_MAKS} tegn.` };
  if (await findesDagtype(supabaseAdmin, ren)) {
    return { ok: false, fejl: `Der findes allerede en dagtype med navnet "${ren}".` };
  }
  if (typeof kopierFra !== "string" || !(await findesDagtype(supabaseAdmin, kopierFra))) {
    return { ok: false, fejl: "Den dagtype, der skulle kopieres fra, findes ikke." };
  }

  // Kostindholdet kopieres fra den valgte type, så den nye starter med noget
  // på skærmen og kun skal rettes til.
  const { data: kilde } = await supabaseAdmin
    .from("infoskaerm_indhold")
    .select("farve, titel, undertitel_da, undertitel_en, kortnavn, farvekode, lys_farvekode, blokke")
    .eq("farve", kopierFra)
    .maybeSingle();
  const grundlag = erIndholdRow(kilde) ? kilde : fraDagIndhold(kopierFra, standardIndhold(kopierFra));

  const { data: sidste } = await supabaseAdmin
    .from("infoskaerm_indhold")
    .select("raekkefoelge")
    .order("raekkefoelge", { ascending: false })
    .limit(1)
    .maybeSingle();
  const raekkefoelge = typeof sidste?.raekkefoelge === "number" ? sidste.raekkefoelge + 1 : 100;

  const { error } = await supabaseAdmin.from("infoskaerm_indhold").insert({
    ...grundlag,
    farve: ren,
    titel: ren,
    kortnavn: ren,
    raekkefoelge,
  });

  if (error) {
    console.error("Kunne ikke oprette dagtype:", error);
    return { ok: false, fejl: `Kunne ikke oprette: ${beskrivSupabaseFejl(error)}` };
  }

  // Et design kopieres med, men slukket, så det ikke dukker op før det er set.
  const { data: design } = await supabaseAdmin
    .from("infoskaerm_design")
    .select("baggrund, elementer")
    .eq("farve", kopierFra)
    .maybeSingle();
  if (design) {
    const { error: designFejl } = await supabaseAdmin
      .from("infoskaerm_design")
      .insert({ farve: ren, baggrund: design.baggrund, elementer: design.elementer, aktiv: false });
    if (designFejl) console.error("Design blev ikke kopieret til ny dagtype:", designFejl);
  }

  genopfrisk();
  return { ok: true };
}

export async function omdoebDagtype(farve: string, nytNavn: string): Promise<Resultat> {
  if (!(await harAdgang())) return { ok: false, fejl: IKKE_ADMIN };
  if (typeof farve !== "string" || erStandardDagtype(farve)) {
    return { ok: false, fejl: "Rød, Gul og Grøn kan ikke omdøbes." };
  }

  const ren = rensNavn(nytNavn);
  if (!ren) return { ok: false, fejl: `Navnet skal være 1-${NAVN_MAKS} tegn.` };
  if (ren === farve) return { ok: true };
  if (await findesDagtype(supabaseAdmin, ren)) {
    return { ok: false, fejl: `Der findes allerede en dagtype med navnet "${ren}".` };
  }

  // Fremmednøglerne er "on update cascade", så ugeplan og design følger med.
  const { data: foer } = await supabaseAdmin
    .from("infoskaerm_indhold")
    .select("titel, kortnavn")
    .eq("farve", farve)
    .maybeSingle();
  if (!foer) return { ok: false, fejl: "Dagtypen findes ikke længere. Genindlæs siden." };

  const { error } = await supabaseAdmin
    .from("infoskaerm_indhold")
    .update({
      farve: ren,
      // Titel og kortnavn følger kun med, hvis de stadig hed det samme som typen.
      ...(foer.titel === farve ? { titel: ren } : {}),
      ...(foer.kortnavn === farve ? { kortnavn: ren } : {}),
    })
    .eq("farve", farve);

  if (error) {
    console.error("Kunne ikke omdøbe dagtype:", error);
    return { ok: false, fejl: `Kunne ikke omdøbe: ${beskrivSupabaseFejl(error)}` };
  }

  genopfrisk();
  return { ok: true };
}

export async function sletDagtype(farve: string): Promise<Resultat> {
  if (!(await harAdgang())) return { ok: false, fejl: IKKE_ADMIN };
  if (typeof farve !== "string" || erStandardDagtype(farve)) {
    return { ok: false, fejl: "Rød, Gul og Grøn kan ikke slettes." };
  }

  const { count } = await supabaseAdmin
    .from("infoskaerm_ugeplan")
    .select("dato", { count: "exact", head: true })
    .eq("farve", farve)
    .gte("dato", todayKey());
  if (count && count > 0) {
    return {
      ok: false,
      fejl: `"${farve}" bruges på ${count} ${count === 1 ? "dag" : "dage"} i ugeplanen. Skift de dage til en anden farve først.`,
    };
  }

  // Afviklede dage med typen flyttes til Grøn, så fremmednøglen ikke blokerer.
  // Historikken bruges ikke til noget; skærmen viser kun i dag.
  const { error: flytFejl } = await supabaseAdmin
    .from("infoskaerm_ugeplan")
    .update({ farve: "Grøn" })
    .eq("farve", farve)
    .lt("dato", todayKey());
  if (flytFejl) {
    console.error("Kunne ikke flytte gamle dage:", flytFejl);
    return { ok: false, fejl: `Kunne ikke slette: ${beskrivSupabaseFejl(flytFejl)}` };
  }

  const { error } = await supabaseAdmin.from("infoskaerm_indhold").delete().eq("farve", farve);
  if (error) {
    console.error("Kunne ikke slette dagtype:", error);
    return { ok: false, fejl: `Kunne ikke slette: ${beskrivSupabaseFejl(error)}` };
  }

  genopfrisk();
  return { ok: true };
}
