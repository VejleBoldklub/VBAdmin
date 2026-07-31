import { supabaseAdmin } from "@/lib/supabase-admin";
import type { LokaleSlug } from "./lokaler";
import type { Optagethed } from "./types";

// Henter de optagede tidsrum til ugevisningen — med bookingens oplysninger.
//
// VIGTIGT om hvad denne funktion returnerer: navn, mail og mobil på den, der har
// booket. Det vises på en side uden login. Klubben har truffet beslutningen
// bevidst, så trænere kan se i kalenderen, hvem der har lokalet, uden at logge
// ind.
//
// Læsningen sker med service_role og går uden om rækkesikkerheden. Anon-nøglen
// har fortsat INGEN adgang til bookingtabellen, og det skal den ikke få: så
// længe det kun er vores serverkode, der kan hente oplysningerne, er det også
// kun vores serverkode, der bestemmer, hvad der vises. Udvidede vi i stedet
// viewet lokale_optagethed, ville enhver med anon-nøglen kunne hente hele
// bookingtabellens persondata direkte fra API'et.
//
// Modulet har med vilje ikke "use server" — se bookinger.ts for begrundelsen.
// Det kaldes fra sidegengivelsen, ikke som et endepunkt.

// Kolonnerne nævnes eksplicit. Et select("*") ville tage godkend_token_hash og
// slet_token_hash med, og de skal aldrig forlade databasen — og det ville tage
// e-mailadressen med, som med vilje ikke vises offentligt. Det, der ikke hentes,
// kan ikke slippe ud ved et uheld længere fremme.
const KOLONNER = "lokale,start_tid,slut_tid,status,formaal,hold,navn,mobil";

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
    //
    // Filteret på status svarer til det, viewet gjorde: kun bookinger, der
    // holder tiden, tegnes. Afviste og aflyste frigiver tidsrummet igen.
    const { data, error } = await supabaseAdmin
      .from("lokale_bookinger")
      .select(KOLONNER)
      .eq("lokale", lokale)
      .in("status", ["afventer", "bekraeftet"])
      .lt("start_tid", til.toISOString())
      .gt("slut_tid", fra.toISOString())
      .order("start_tid", { ascending: true });

    if (error) {
      console.error(`Kunne ikke hente optagethed for ${lokale}: ${error.message}`);
      return { ok: false };
    }

    return { ok: true, bookinger: (data ?? []) as unknown as Optagethed[] };
  } catch (e) {
    console.error(
      `Kunne ikke hente optagethed for ${lokale}: ${e instanceof Error ? e.message : String(e)}`
    );
    return { ok: false };
  }
}
