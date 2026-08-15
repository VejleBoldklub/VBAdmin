"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlanSlug } from "./plans";
import type { BaneplanData, BaneplanVersion } from "./types";

function adminPathFor(slug: PlanSlug) {
  return `/admin/baneplan/${slug}`;
}

// Den offentlige rute caches. Publicering skal derfor sige til, ellers viser
// klubbens iframe den forrige plan indtil næste automatiske fornyelse.
function publicPathFor(slug: PlanSlug) {
  return `/baneplan/${slug}`;
}

const TOM_DATA: BaneplanData = { fields: [], events: [] };

// Adgangskontrol for hver handling i filen.
//
// Handlingerne skriver med service_role og kan publicere eller kassere en
// baneplan. At proxy.ts beskytter /admin er ikke nok: en server action slås op
// på sit id og kan rammes fra enhver rute i appen, også de offentlige
// baneplansider, som med vilje ikke er bag login. Samme begrundelse som i
// lib/adgang.ts.
//
// Der kastes frem for at svare pænt. Handlingerne kaldes kun fra kladde-
// editoren, hvor brugeren allerede er sluppet gennem proxy.ts — når vi når
// hertil uden adgang, er det ikke en almindelig bruger, der har taget fejl.
async function kraevBaneplan(): Promise<void> {
  if (!(await kraevAdgang("baneplan"))) {
    console.error("Afvist forsøg på at bruge baneplanens handlinger uden adgang.");
    throw new Error("Ingen adgang til baneplanen.");
  }
}

export async function hentLivePlan(
  slug: PlanSlug
): Promise<BaneplanVersion | null> {
  await kraevBaneplan();

  const { data, error } = await supabaseAdmin
    .from("baneplan_versioner")
    .select("*")
    .eq("plan_slug", slug)
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke hente live-plan: ${error.message}`);
  }

  return data as BaneplanVersion | null;
}

export async function hentKladde(
  slug: PlanSlug
): Promise<BaneplanVersion | null> {
  await kraevBaneplan();

  const { data, error } = await supabaseAdmin
    .from("baneplan_versioner")
    .select("*")
    .eq("plan_slug", slug)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke hente kladde: ${error.message}`);
  }

  return data as BaneplanVersion | null;
}

export async function opretKladdeFraLive(slug: PlanSlug) {
  await kraevBaneplan();

  const eksisterendeKladde = await hentKladde(slug);
  if (eksisterendeKladde) {
    revalidatePath(adminPathFor(slug));
    return;
  }

  const livePlan = await hentLivePlan(slug);

  const { error } = await supabaseAdmin.from("baneplan_versioner").insert({
    plan_slug: slug,
    saesontitel: livePlan?.saesontitel ?? "",
    data: livePlan?.data ?? TOM_DATA,
    status: "draft",
  });

  if (error) {
    throw new Error(`Kunne ikke oprette kladde: ${error.message}`);
  }

  revalidatePath(adminPathFor(slug));
}

// Kaldes løbende af kladde-editorens autosave. Revaliderer bevidst IKKE ruten:
// editoren holder selv kladdens tilstand, mens der redigeres, så en revalidering
// pr. gemning ville udløse en serverrundtur og en gennemtegning af hele siden
// uden at ændre noget synligt. Live-planen på samme side er upåvirket af, at en
// kladde gemmes. Publicering og kassering revaliderer fortsat.
export async function gemKladde(id: string, saesontitel: string, data: BaneplanData) {
  await kraevBaneplan();

  const { error } = await supabaseAdmin
    .from("baneplan_versioner")
    .update({
      saesontitel,
      data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft");

  if (error) {
    throw new Error(`Kunne ikke gemme kladde: ${error.message}`);
  }
}

// En kladde bliver live med det samme ved publicering. Der findes ikke
// planlagt publicering; den offentlige synlighed styres manuelt i klubbens CMS.
export async function publicerKladde(id: string, slug: PlanSlug) {
  await kraevBaneplan();

  const { error: arkivFejl } = await supabaseAdmin
    .from("baneplan_versioner")
    .update({ status: "archived" })
    .eq("plan_slug", slug)
    .eq("status", "live");

  if (arkivFejl) {
    throw new Error(`Kunne ikke arkivere nuværende live-plan: ${arkivFejl.message}`);
  }

  const { error } = await supabaseAdmin
    .from("baneplan_versioner")
    .update({ status: "live" })
    .eq("id", id)
    .eq("plan_slug", slug)
    .eq("status", "draft");

  if (error) {
    throw new Error(`Kunne ikke publicere kladde: ${error.message}`);
  }

  revalidatePath(adminPathFor(slug));
  // Kun publicering ændrer, hvad offentligheden ser. At gemme eller kassere en
  // kladde rører ikke live-planen og skal derfor ikke revalidere den her.
  revalidatePath(publicPathFor(slug));
}

export async function kasserKladde(id: string, slug: PlanSlug) {
  await kraevBaneplan();

  const { error } = await supabaseAdmin
    .from("baneplan_versioner")
    .delete()
    .eq("id", id)
    .eq("status", "draft");

  if (error) {
    throw new Error(`Kunne ikke kassere kladde: ${error.message}`);
  }

  revalidatePath(adminPathFor(slug));
}
