import { supabasePublic } from "@/lib/supabase-public";
import type { LokaleSlug } from "./lokaler";
import type { Optagethed } from "./types";

// Henter de optagede tidsrum til ugevisningen.
//
// Læser viewet lokale_optagethed, ikke tabellen. Viewet er det eneste anon-nøglen
// har select-ret på, og det indeholder hverken navn, mail eller mobil. Selv en
// fejl her kan altså ikke sende kontaktoplysninger til den offentlige side.
//
// Kolonnerne nævnes eksplicit frem for select("*"), så en fremtidig udvidelse af
// viewet ikke tavst begynder at sende mere ud på den offentlige rute end det, der
// skal tegnes.
//
// Fejl bliver et resultat, ikke en tom liste. Det er forskellen fra
// features/baneplan/public-plan.ts, hvor en fejl tavst bliver "ingen plan
// publiceret": en tom baneplan er til at gennemskue, men en tom uge ser ud som om
// alting er ledigt, og så vil brugeren udfylde en formular for et tidsrum, der er
// taget. Databasens udelukkelsesregel afviser den ganske vist, men brugeren har
// spildt turen. Siden viser derfor en advarsel frem for et falsk tomt gitter.
export type OptagethedResultat =
  | { ok: true; bookinger: Optagethed[] }
  // Uden årsag, med vilje. Den offentlige side skal ikke fortælle en besøgende,
  // om det var en manglende nøgle eller en manglende policy. Årsagen logges.
  | { ok: false };

export async function hentOptagethed(
  lokale: LokaleSlug,
  fra: Date,
  til: Date
): Promise<OptagethedResultat> {
  try {
    // Overlap, ikke indeholdt-i: en booking, der begynder søndag kl. 21 og
    // strækker sig ind i næste uge, skal med i begge uger. Sammenligningen er
    // derfor "starter før vinduet slutter" og "slutter efter vinduet begynder".
    const { data, error } = await supabasePublic()
      .from("lokale_optagethed")
      .select("lokale,start_tid,slut_tid,status")
      .eq("lokale", lokale)
      .lt("start_tid", til.toISOString())
      .gt("slut_tid", fra.toISOString())
      .order("start_tid", { ascending: true });

    if (error) {
      console.error(`Kunne ikke hente optagethed for ${lokale}: ${error.message}`);
      return { ok: false };
    }

    return { ok: true, bookinger: (data ?? []) as Optagethed[] };
  } catch (e) {
    console.error(
      `Kunne ikke hente optagethed for ${lokale}: ${e instanceof Error ? e.message : String(e)}`
    );
    return { ok: false };
  }
}
