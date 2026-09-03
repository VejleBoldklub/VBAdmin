"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { afgoerViaId, aflysSerieViaId, aflysViaId } from "./beslutning";
import type { BeslutResultat } from "./types";

// Godkendelse og afvisning fra adminfladen.
//
// Filen er et lag omkring beslutning.ts og gør tre ting: kontrollerer adgangen,
// kontrollerer det indtastede, og beder siden om at blive gengivet igen. Selve
// opdateringen og mailen til bookeren ligger i beslutning.ts, fordi mail-linket
// skal gøre nøjagtig det samme — kun besluttet_af er forskelligt.
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

export async function godkendBooking(id: string): Promise<BeslutResultat> {
  if (!(await kraevAdgang("lokalebooking"))) {
    console.error("Afvist forsøg på at godkende en booking uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(id)) {
    return { ok: false, fejl: GENERISK };
  }

  const svar = await afgoerViaId(id, "godkend", null);

  // Siden gengives igen, uanset udfaldet. Er bookingen allerede behandlet, er det
  // netop listen, der er forældet, og den skal opdateres for at vise hvorfor.
  revalidatePath(ADMIN_STI);

  return svar;
}

// Annullering af en booking, klubben tager tilbage — uanset om den afventer eller
// allerede er bekræftet, og uanset lokale.
//
// Ingen begrundelse. Afvisning har en, fordi den er svaret på en forespørgsel, og
// bookeren har brug for at vide hvorfor. En annullering sker typisk, fordi
// klubben selv skal bruge lokalet, og et påkrævet felt ville blive udfyldt med
// "aflyst" i en fart. Har bookeren brug for en forklaring, er Reply-To i mailen
// vejen — den peger på den lokaleansvarlige.
export async function annullerBooking(id: string): Promise<BeslutResultat> {
  if (!(await kraevAdgang("lokalebooking"))) {
    console.error("Afvist forsøg på at annullere en booking uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(id)) {
    return { ok: false, fejl: GENERISK };
  }

  const svar = await aflysViaId(id);

  revalidatePath(ADMIN_STI);

  return svar;
}

export async function afvisBooking(id: string, grund: string): Promise<BeslutResultat> {
  if (!(await kraevAdgang("lokalebooking"))) {
    console.error("Afvist forsøg på at afvise en booking uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(id)) {
    return { ok: false, fejl: GENERISK };
  }

  const renGrund = grund.trim();

  // Grunden er påkrævet. Den står i afslagsmailen til bookeren, og et afslag uden
  // forklaring er ikke til nogen nytte — hverken for den, der har booket, eller
  // for den, der senere skal forstå hvorfor.
  if (renGrund === "") {
    return { ok: false, fejl: "Skriv en kort begrundelse for afvisningen." };
  }
  if (renGrund.length > AFVISNING_MAKS) {
    return { ok: false, fejl: `Begrundelsen må højst være ${AFVISNING_MAKS} tegn.` };
  }

  const svar = await afgoerViaId(id, "afvis", renGrund);

  // Bemærk hvad afvisningen også gør: udelukkelsesreglen dækker kun afventende og
  // bekræftede bookinger, så tidsrummet bliver ledigt i samme øjeblik. Den
  // offentlige side hentes altid på ny og viser det med det samme — derfor er der
  // ingen revalidering af den her.
  revalidatePath(ADMIN_STI);

  return svar;
}

// Aflysning af en hel serie på én gang.
//
// Egen handling frem for et flag på annullerBooking. De to gør forskellige ting i
// forskelligt omfang, og en knap, der kan aflyse tolv bookinger, skal ikke kunne
// forveksles med en, der aflyser én — hverken i brugerfladen eller her.
//
// Bookeren får én samlet mail om hele serien; det sker inde i aflysSerieViaId,
// sammen med opdateringen.
export async function annullerSerie(serieId: string): Promise<BeslutResultat> {
  if (!(await kraevAdgang("lokalebooking"))) {
    console.error("Afvist forsøg på at aflyse en serie uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(serieId)) {
    return { ok: false, fejl: GENERISK };
  }

  const svar = await aflysSerieViaId(serieId);

  revalidatePath(ADMIN_STI);

  return svar;
}
