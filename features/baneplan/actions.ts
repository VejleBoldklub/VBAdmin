"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlanSlug } from "./plans";
import type { BaneplanData, BaneplanVersion, ScheduleEvent, ScheduleField } from "./types";

function adminPathFor(slug: PlanSlug) {
  return `/admin/baneplan/${slug}`;
}

const TOM_DATA: BaneplanData = { fields: [], events: [] };

export async function hentLivePlan(
  slug: PlanSlug
): Promise<BaneplanVersion | null> {
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
export async function gemKladde(
  id: string,
  saesontitel: string,
  fields: ScheduleField[],
  events: ScheduleEvent[]
) {
  const { error } = await supabaseAdmin
    .from("baneplan_versioner")
    .update({
      saesontitel,
      data: { fields, events },
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
}

export async function kasserKladde(id: string, slug: PlanSlug) {
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
