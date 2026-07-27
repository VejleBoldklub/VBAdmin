"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PlanSlug } from "./plans";
import type { BaneplanVersion, Tildeling } from "./types";

function adminPathFor(slug: PlanSlug) {
  return `/admin/baneplan/${slug}`;
}

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
    data: livePlan?.data ?? { tildelinger: [] },
    status: "draft",
  });

  if (error) {
    throw new Error(`Kunne ikke oprette kladde: ${error.message}`);
  }

  revalidatePath(adminPathFor(slug));
}

export async function gemKladde(
  id: string,
  slug: PlanSlug,
  saesontitel: string,
  tildelinger: Tildeling[]
) {
  const { error } = await supabaseAdmin
    .from("baneplan_versioner")
    .update({
      saesontitel,
      data: { tildelinger },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft");

  if (error) {
    throw new Error(`Kunne ikke gemme kladde: ${error.message}`);
  }

  revalidatePath(adminPathFor(slug));
}

export async function publicerKladde(
  id: string,
  slug: PlanSlug,
  ikrafttraedelsesdato: string
) {
  if (!ikrafttraedelsesdato) {
    throw new Error("Ikrafttrædelsesdato er påkrævet ved publicering.");
  }

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
    .update({ status: "live", ikrafttraedelsesdato })
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
