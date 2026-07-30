"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { erAdmin } from "./admin-auth";
import type { BeslutResultat } from "./types";

// Godkendelse og afvisning af cafeteria-bookinger.
//
// Skrivningen sker med service_role, som omgår rækkesikkerheden. Der findes med
// vilje ingen update-policy for anon: en booking må kun kunne besluttes herfra
// eller senere fra et mail-link med et engangstoken.
//
// Begge handlinger kontrollerer selv, at kaldet kommer fra en indlogget
// administrator. Begrundelsen står i admin-auth.ts — kort: en server action er et
// endepunkt, der kan rammes fra enhver rute, også de offentlige, så det er ikke
// nok at proxy.ts beskytter /admin.

const ADMIN_STI = "/admin/lokalebooking";

const AFVISNING_MAKS = 500;

// Id'et kommer fra klienten og bruges i en forespørgsel. PostgREST afviser en
// ugyldig uuid med en databasefejl, men så ville en tastefejl blive logget som om
// noget var i stykker. Formen tjekkes derfor først.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";
const GENERISK = "Handlingen kunne ikke gennemføres. Prøv igen.";
const ALLEREDE =
  "Bookingen er ikke længere afventende — en anden har behandlet den, eller siden er forældet.";

export async function godkendBooking(id: string): Promise<BeslutResultat> {
  if (!(await erAdmin())) {
    console.error("Afvist forsøg på at godkende en booking uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(id)) {
    return { ok: false, fejl: GENERISK };
  }

  // Betingelsen på status er det, der gør handlingen sikker at trykke på to
  // gange: den rammer kun en booking, der stadig afventer. To administratorer,
  // der trykker samtidig, kan altså ikke overskrive hinandens beslutning — den
  // anden får at vide, at bookingen allerede er behandlet.
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      status: "bekraeftet",
      besluttet_af: "admin",
      // Serverens tid, ikke databasens now(). De to følges, og alternativet ville
      // være et kald til en databasefunktion alene for at sætte et tidsstempel.
      besluttet_tid: new Date().toISOString(),
      // En tidligere afvisningsgrund må ikke stå tilbage på en booking, der nu er
      // bekræftet. Feltet kan kun være udfyldt, hvis bookingen har været afvist
      // og siden sat tilbage til afventende i hånden.
      afvisningsgrund: null,
    })
    .eq("id", id)
    .eq("status", "afventer")
    .select("id");

  if (error) {
    console.error(`Kunne ikke godkende booking ${id}: ${error.message}`);
    return { ok: false, fejl: GENERISK };
  }

  // Siden gengives igen, uanset udfaldet. Er bookingen allerede behandlet, er det
  // netop listen, der er forældet, og den skal opdateres for at vise hvorfor.
  revalidatePath(ADMIN_STI);

  if ((data ?? []).length === 0) {
    return { ok: false, fejl: ALLEREDE };
  }

  return { ok: true };
}

export async function afvisBooking(id: string, grund: string): Promise<BeslutResultat> {
  if (!(await erAdmin())) {
    console.error("Afvist forsøg på at afvise en booking uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(id)) {
    return { ok: false, fejl: GENERISK };
  }

  const renGrund = grund.trim();

  // Grunden er påkrævet. Den skal med i afslagsmailen i næste PR, og et afslag
  // uden forklaring er ikke til nogen nytte — hverken for den, der har booket,
  // eller for den, der senere skal forstå hvorfor.
  if (renGrund === "") {
    return { ok: false, fejl: "Skriv en kort begrundelse for afvisningen." };
  }
  if (renGrund.length > AFVISNING_MAKS) {
    return { ok: false, fejl: `Begrundelsen må højst være ${AFVISNING_MAKS} tegn.` };
  }

  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      status: "afvist",
      besluttet_af: "admin",
      besluttet_tid: new Date().toISOString(),
      afvisningsgrund: renGrund,
    })
    .eq("id", id)
    .eq("status", "afventer")
    .select("id");

  if (error) {
    console.error(`Kunne ikke afvise booking ${id}: ${error.message}`);
    return { ok: false, fejl: GENERISK };
  }

  // Bemærk hvad afvisningen også gør: udelukkelsesreglen dækker kun afventende og
  // bekræftede bookinger, så tidsrummet bliver ledigt i samme øjeblik. Den
  // offentlige side hentes altid på ny og viser det med det samme — derfor er der
  // ingen revalidering af den her.
  revalidatePath(ADMIN_STI);

  if ((data ?? []).length === 0) {
    return { ok: false, fejl: ALLEREDE };
  }

  return { ok: true };
}
