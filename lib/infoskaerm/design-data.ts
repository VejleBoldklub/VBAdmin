import type { SupabaseClient } from "@supabase/supabase-js";
import type { DagFarve } from "./content";
import { beskrivSupabaseFejl } from "./data";
import { rensDesign, type Design } from "./design";

// Læsning af designs. Klienten sendes ind af kaldstedet som i resten af
// lib/infoskaerm: skærmen med anon-nøglen, adminfladen med service_role.

export type GemtDesign = { design: Design | null; aktiv: boolean };

// Dagens design til skærmen, eller null.
//
// Null både når der intet aktivt design er, og når opslaget fejler eller
// designet ikke består kontrollen. I alle tre tilfælde viser skærmen
// kostkortene, som den gjorde før editoren fandtes.
export async function getAktivtDesign(
  client: SupabaseClient,
  farve: DagFarve
): Promise<Design | null> {
  const { data, error } = await client
    .from("infoskaerm_design")
    .select("baggrund, elementer, aktiv")
    .eq("farve", farve)
    .eq("aktiv", true)
    .maybeSingle();

  if (error) {
    console.error("infoskaerm_design fetch fejl:", error);
    return null;
  }

  return data ? rensDesign(data) : null;
}

export async function getAlleDesigns(
  client: SupabaseClient
): Promise<{ designs: Record<DagFarve, GemtDesign>; fejl: string | null }> {
  const designs: Record<DagFarve, GemtDesign> = {
    Rød: { design: null, aktiv: false },
    Gul: { design: null, aktiv: false },
    Grøn: { design: null, aktiv: false },
  };

  const { data, error } = await client
    .from("infoskaerm_design")
    .select("farve, baggrund, elementer, aktiv");

  if (error) {
    console.error("infoskaerm_design liste-fejl:", error);
    return { designs, fejl: beskrivSupabaseFejl(error) };
  }

  for (const r of Array.isArray(data) ? data : []) {
    if (r.farve === "Rød" || r.farve === "Gul" || r.farve === "Grøn") {
      designs[r.farve as DagFarve] = { design: rensDesign(r), aktiv: r.aktiv === true };
    }
  }

  return { designs, fejl: null };
}
