import { supabaseAdmin } from "@/lib/supabase-admin";
import { tidsrumDelt } from "./regler";
import type { Booking, BookingFilter, SerieOverblik } from "./types";

// Læsning af bookinger til adminfladen, med kontaktoplysninger.
//
// VIGTIGT: dette modul har med vilje IKKE "use server" og må kun importeres fra
// Server Components. Et "use server"-modul gør hver eksport til et
// POST-endepunkt, der kan kaldes fra enhver rute i appen, og disse funktioner
// returnerer navn, mail og mobil på klubbens medlemmer. Læsningen hører derfor i
// selve sidegengivelsen, hvor proxy.ts' adgangskontrol allerede har været forbi.
//
// Bruger service_role, som omgår rækkesikkerheden. Det er nødvendigt: anon har
// ingen select-rettighed på lokale_bookinger, og det skal den heller ikke have —
// se supabase/lokalebooking-skema.sql.

// Kolonnerne nævnes eksplicit. Et select("*") ville tage godkend_token_hash og
// slet_token_hash med, og de har intet at gøre i en sidegengivelse: hasher, der
// aldrig forlader databasen, kan ikke lækkes ved et uheld.
const KOLONNER =
  "id,lokale,start_tid,slut_tid,status,formaal,hold,navn,email,mobil,besked," +
  "besluttet_af,besluttet_tid,afvisningsgrund,serie_id,created_at,updated_at";

// Loftet findes for at en side aldrig kan hente et ubegrænset antal rækker.
// Rammes det, siger listen det højt frem for tavst at vise et udsnit.
export const MAKS_RAEKKER = 500;

export type BookingListe = {
  bookinger: Booking[];
  // Sandt, hvis der findes flere rækker, end loftet tillod.
  afkortet: boolean;
};

export async function hentBookinger(filter: BookingFilter): Promise<BookingListe> {
  let forespoergsel = supabaseAdmin
    .from("lokale_bookinger")
    .select(KOLONNER)
    .order("start_tid", { ascending: true })
    // Ét ekstra end loftet, alene for at kunne se om der var mere.
    .limit(MAKS_RAEKKER + 1);

  if (filter.lokale !== "alle") {
    forespoergsel = forespoergsel.eq("lokale", filter.lokale);
  }
  if (filter.status !== "alle") {
    forespoergsel = forespoergsel.eq("status", filter.status);
  }
  if (filter.periode === "kommende") {
    // Bookinger, der endnu ikke er slut. En booking, der er i gang lige nu, er
    // stadig kommende i den forstand, at den ikke er overstået.
    forespoergsel = forespoergsel.gte("slut_tid", new Date().toISOString());
  }

  const { data, error } = await forespoergsel;

  if (error) {
    throw new Error(`Kunne ikke hente bookinger: ${error.message}`);
  }

  const raekker = (data ?? []) as unknown as Booking[];

  return {
    bookinger: raekker.slice(0, MAKS_RAEKKER),
    afkortet: raekker.length > MAKS_RAEKKER,
  };
}

// Cafeteria-bookinger, der venter på en beslutning.
//
// Uafhængig af filtrene på siden med vilje: det er listen over noget, der skal
// handles på, og den må ikke kunne skjules ved et uheld ved at filtrere på et
// andet lokale eller en anden status.
//
// Filtret på lokale er ikke pynt. Mødelokalet må aldrig kræve godkendelse, og
// skulle en mødelokale-booking alligevel stå som afventende, hører den ikke i
// godkendelseskøen — den er et tegn på en fejl et andet sted og skal ikke
// kvitteres væk her.
export async function hentAfventende(): Promise<Booking[]> {
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .select(KOLONNER)
    .eq("lokale", "cafeteria")
    .eq("status", "afventer")
    .order("start_tid", { ascending: true });

  if (error) {
    throw new Error(`Kunne ikke hente afventende bookinger: ${error.message}`);
  }

  return (data ?? []) as unknown as Booking[];
}

export async function hentSerieOverblik(
  serieIds: string[]
): Promise<Record<string, SerieOverblik>> {
  const unikke = [...new Set(serieIds)];
  if (unikke.length === 0) return {};

  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .select("serie_id,start_tid,slut_tid,status")
    .in("serie_id", unikke)
    .order("start_tid", { ascending: true });

  if (error) {
    // Ikke en fejl, der skal vælte siden. Uden overblikket mister rækkerne deres
    // seriemarkering, og en samlet aflysning kan ikke tilbydes — men listen selv
    // er der stadig, og den er det, siden er til for.
    console.error(`Kunne ikke hente serieoverblik: ${error.message}`);
    return {};
  }

  type Raekke = {
    serie_id: string;
    start_tid: string;
    slut_tid: string;
    status: Booking["status"];
  };

  const ud: Record<string, SerieOverblik> = {};

  for (const r of (data ?? []) as unknown as Raekke[]) {
    const dag = tidsrumDelt(new Date(r.start_tid), new Date(r.slut_tid)).dag;
    const aktiv = r.status === "afventer" || r.status === "bekraeftet";
    const kendt = ud[r.serie_id];

    if (!kendt) {
      ud[r.serie_id] = { ialt: 1, aktive: aktiv ? 1 : 0, foersteDag: dag, sidsteDag: dag };
      continue;
    }

    kendt.ialt += 1;
    if (aktiv) kendt.aktive += 1;
    // Rækkerne kommer sorteret på starttidspunkt, så den sidste, der ses, er den
    // seneste.
    kendt.sidsteDag = dag;
  }

  return ud;
}
