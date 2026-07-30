import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Lokale } from "./lokaler";
import { appBaseUrl, sendMail } from "./mail";
import {
  bekraeftelseTilBooker,
  notifikationTilAnsvarlig,
  type MailBooking,
} from "./mail-tekster";
import { tidsrumTekst } from "./regler";
import { nytToken, tokenHash } from "./tokens";

// Mails ved oprettelse af en booking: kvittering til bookeren, og for cafeteriet
// desuden en notifikation til den ansvarlige med et godkend- og et afvis-link.
//
// Hele filen er bygget på én regel: intet herinde må kunne vælte en booking, der
// allerede er oprettet. Funktionen kaster ikke — den logger og går videre. En
// booking uden kvitteringsmail er et irritationsmoment; en booking, der blev
// afvist over for brugeren, fordi en mailserver var nede, er tabt arbejde.

type NyBookingVarsel = {
  id: string;
  lokale: Lokale;
  start: Date;
  slut: Date;
  formaal: string;
  hold: string | null;
  navn: string;
  email: string;
  mobil: string;
  besked: string | null;
};

// Gemmer hashene af de to engangstokens på bookingen og giver tokenerne tilbage,
// så de kan sættes i mailen.
//
// Skrivningen sker med service_role. Den offentlige rute bruger anon-nøglen, og
// den kan hverken sætte eller se de to kolonner: rettigheden dækker dem ikke, og
// policyen kræver at de er null ved oprettelse. Kunne anon sætte dem, kunne man
// vælge sit eget token og derefter godkende sin egen cafeteria-booking.
//
// Betingelsen på status er med, så tokens kun kan lægges på en booking, der
// faktisk afventer.
async function gemTokens(id: string): Promise<{ godkend: string; afvis: string } | null> {
  const godkend = nytToken();
  const afvis = nytToken();

  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      godkend_token_hash: tokenHash(godkend),
      slet_token_hash: tokenHash(afvis),
    })
    .eq("id", id)
    .eq("status", "afventer")
    .select("id");

  if (error) {
    console.error(`Kunne ikke gemme tokens for booking ${id}: ${error.message}`);
    return null;
  }

  if ((data ?? []).length === 0) {
    console.error(`Kunne ikke gemme tokens for booking ${id}: bookingen afventer ikke længere.`);
    return null;
  }

  return { godkend, afvis };
}

export async function varslOmNyBooking(varsel: NyBookingVarsel): Promise<void> {
  try {
    const { lokale } = varsel;

    const data: MailBooking = {
      lokaleNavn: lokale.navn,
      naar: tidsrumTekst(varsel.start, varsel.slut),
      formaal: varsel.formaal,
      hold: varsel.hold,
      navn: varsel.navn,
      email: varsel.email,
      mobil: varsel.mobil,
      besked: varsel.besked,
    };

    const kvittering = bekraeftelseTilBooker(
      data,
      lokale.kraeverGodkendelse,
      lokale.ansvarligEmail !== null
    );

    const udsendelser: Promise<unknown>[] = [
      sendMail({
        til: varsel.email,
        emne: kvittering.emne,
        html: kvittering.html,
        tekst: kvittering.tekst,
        svarTil: lokale.ansvarligEmail,
      }),
    ];

    // Kun lokaler, der skal godkendes, har nogen at varsle. Mødelokalet er
    // bekræftet i samme øjeblik, det bookes, og der er ikke noget at tage
    // stilling til.
    if (lokale.kraeverGodkendelse && lokale.ansvarligEmail) {
      const tokens = await gemTokens(varsel.id);

      if (tokens) {
        const base = await appBaseUrl();
        const notifikation = notifikationTilAnsvarlig(
          data,
          `${base}/godkend/${tokens.godkend}`,
          `${base}/afvis/${tokens.afvis}`
        );

        udsendelser.push(
          sendMail({
            til: lokale.ansvarligEmail,
            emne: notifikation.emne,
            html: notifikation.html,
            tekst: notifikation.tekst,
            // Et svar på notifikationen skal gå til bookeren, ikke til den
            // ansvarlige selv. Det er hurtigste vej til at spørge om noget, før
            // der tages stilling.
            svarTil: varsel.email,
          })
        );
      } else {
        // Uden tokens ville linkene i mailen være døde. Så er det bedre slet ikke
        // at sende den: bookingen ligger stadig i adminfladens godkendelseskø.
        console.error(
          `Booking ${varsel.id} blev oprettet, men notifikationen til ${lokale.ansvarligEmail} blev ikke sendt, fordi tokens ikke kunne gemmes.`
        );
      }
    }

    // allSettled, ikke all: den ene mail må ikke afhænge af den anden. Fejler
    // notifikationen, skal bookeren stadig have sin kvittering.
    await Promise.allSettled(udsendelser);
  } catch (e) {
    console.error(
      `Booking ${varsel.id} blev oprettet, men varslingen fejlede: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
