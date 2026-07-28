import { supabasePublic } from "@/lib/supabase-public";
import type { PlanSlug } from "./plans";
import type { BaneplanVersion } from "./types";

// Henter den offentligt gældende plan for en rute.
//
// Filteret på status = 'live' er både forespørgsel og bælte: RLS-policyen
// tillader kun anon at læse live-rækker, og forespørgslen beder kun om dem.
//
// Fejler opslaget — manglende miljøvariabler, manglende policy, netværk — får
// siden en tom tilstand frem for en fejlside. En baneplan i klubbens iframe skal
// ikke vise en 500 til besøgende, og det gør samtidig at `next build` kan
// prerendere siden uden databaseadgang.
//
// Årsagen logges server-side, fordi en manglende RLS-policy ellers ser fuldstændig
// ud som "ingen plan publiceret": anon får tomt svar, ikke en fejl.
export async function hentOffentligLivePlan(slug: PlanSlug): Promise<BaneplanVersion | null> {
  try {
    const { data, error } = await supabasePublic()
      .from("baneplan_versioner")
      .select("*")
      .eq("plan_slug", slug)
      .eq("status", "live")
      .maybeSingle();

    if (error) {
      console.error(`Kunne ikke hente offentlig baneplan for ${slug}: ${error.message}`);
      return null;
    }

    return data as BaneplanVersion | null;
  } catch (e) {
    console.error(
      `Kunne ikke hente offentlig baneplan for ${slug}: ${e instanceof Error ? e.message : String(e)}`
    );
    return null;
  }
}
