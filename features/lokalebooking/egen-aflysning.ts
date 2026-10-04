"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabasePublic } from "@/lib/supabase-public";
import { EMAIL, tekstFra } from "./felter";
import { AFLYSNINGSGRUND_MAKS, type AflysResultat } from "./formular";
import { ipHash, ManglerSalt } from "./ip";
import { findLokale } from "./lokaler";
import { sendMail } from "./mail";
import {
  egenAflysningTilAnsvarlig,
  egenAflysningTilBooker,
  type MailBooking,
} from "./mail-tekster";
import { tidsrumTekst } from "./regler";
import type { Booking } from "./types";

// Bookerens egen annullering, fra en blok i den offentlige kalender.
//
// Der er intet login på den offentlige side. Beviset på, at man er bookeren, er
// den mailadresse, bookingen blev lavet med: den står ikke i kalenderen og
// forlader aldrig serveren, se optagethed.ts. Det er samme identitet som resten
// af modulet bruger — mailen er det eneste, vi ved om den, der har booket.
//
// Id'et står derimod i kalenderen, og en forkert mail giver et nej. Uden en
// grænse ville handlingen derfor kunne bruges til at gætte sig frem til en
// bookers adresse. Hvert forsøg tælles derfor pr. IP, i samme spand som
// oprettelser, før databasen spørges.
//
// Annulleringen skrives med service_role og sætter status 'aflyst' — som når
// klubben annullerer — med besluttet_af = 'booker', så adminlisten kan se
// forskel. Der slettes ikke noget.

const MAKS_FORSOEG_PR_TIME = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GENERISK = "Bookingen kunne ikke annulleres. Prøv igen, eller kontakt klubben.";

// Én besked for "findes ikke", "forkert lokale" og "forkert mail". At skelne
// ville fortælle en fremmed, hvilken del af gættet der var forkert.
const PASSER_IKKE =
  "E-mailadressen passer ikke til bookingen. Brug den adresse, du bookede med.";

const KOLONNER =
  "id,lokale,start_tid,slut_tid,status,formaal,hold,navn,email,mobil,besked," +
  "besluttet_af,besluttet_tid,afvisningsgrund,aflysningsgrund,serie_id,created_at,updated_at";

function normaliseret(email: string): string {
  return email.trim().toLowerCase();
}

export async function annullerEgenBooking(
  slug: string,
  _forrige: AflysResultat,
  fd: FormData
): Promise<AflysResultat> {
  const id = tekstFra(fd, "id");
  const email = tekstFra(fd, "email");
  const grund = tekstFra(fd, "grund");

  const fejl = (tekst: string): AflysResultat => ({ tilstand: "fejl", fejl: tekst });

  const lokale = findLokale(slug);
  if (!lokale) {
    // Slug'en er bundet på serveren, så det her er en programmeringsfejl.
    console.error(`Ukendt lokale i annullerEgenBooking: ${slug}`);
    return fejl(GENERISK);
  }

  if (!UUID.test(id)) {
    return fejl(GENERISK);
  }

  if (!EMAIL.test(email)) {
    return fejl("Skriv den e-mailadresse, du bookede med.");
  }

  if (lokale.aflysningKraeverGrund && grund === "") {
    return fejl("Skriv en begrundelse for annulleringen.");
  }

  if (grund.length > AFLYSNINGSGRUND_MAKS) {
    return fejl(`Begrundelsen må højst være ${AFLYSNINGSGRUND_MAKS} tegn.`);
  }

  let hash: string;
  try {
    hash = await ipHash();
  } catch (e) {
    console.error(
      e instanceof ManglerSalt
        ? `${e.message} Annulleringer afvises, indtil variablen er sat.`
        : `Kunne ikke beregne IP-hash: ${e instanceof Error ? e.message : String(e)}`
    );
    return fejl(GENERISK);
  }

  const { data: maaFortsaette, error: forsoegFejl } = await supabasePublic().rpc(
    "registrer_bookingforsoeg",
    { p_ip_hash: hash, p_maks: MAKS_FORSOEG_PR_TIME }
  );

  if (forsoegFejl) {
    console.error(`Kunne ikke registrere annulleringsforsøg: ${forsoegFejl.message}`);
    return fejl(GENERISK);
  }

  if (maaFortsaette === false) {
    return fejl(
      "Der er lavet mange forsøg fra dette netværk den seneste time. Prøv igen senere, eller kontakt klubben."
    );
  }

  // Bookingen slås op først, og mailen sammenlignes her frem for i
  // forespørgslen. Et ilike-filter med brugerens tekst ville tolke % og _ som
  // jokertegn, og så kunne "%" passe på enhver adresse.
  const { data: fundet, error: opslagFejl } = await supabaseAdmin
    .from("lokale_bookinger")
    .select("id,email")
    .eq("id", id)
    .eq("lokale", lokale.slug)
    .maybeSingle();

  if (opslagFejl) {
    console.error(`Kunne ikke slå booking ${id} op til annullering: ${opslagFejl.message}`);
    return fejl(GENERISK);
  }

  const raekke = fundet as { id: string; email: string } | null;

  if (!raekke || normaliseret(raekke.email) !== normaliseret(email)) {
    return fejl(PASSER_IKKE);
  }

  // Betingelserne på status og starttid gør, at kun en booking, der stadig
  // holder tid og ikke er begyndt, kan annulleres — og at to tryk ikke begge
  // sender mails.
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      status: "aflyst",
      besluttet_af: "booker",
      besluttet_tid: new Date().toISOString(),
      aflysningsgrund: grund === "" ? null : grund,
    })
    .eq("id", raekke.id)
    .in("status", ["afventer", "bekraeftet"])
    .gt("start_tid", new Date().toISOString())
    .select(KOLONNER);

  if (error) {
    console.error(`Kunne ikke annullere booking ${id} for bookeren: ${error.message}`);
    return fejl(GENERISK);
  }

  const booking = ((data ?? []) as unknown as Booking[])[0];

  if (!booking) {
    return fejl("Bookingen er allerede aflyst eller afholdt. Genindlæs siden.");
  }

  await varsl(booking);

  // Kalenderen skal vise tidsrummet som ledigt med det samme.
  revalidatePath(`/lokalebooking/${lokale.slug}`);

  return {
    tilstand: "ok",
    naar: tidsrumTekst(new Date(booking.start_tid), new Date(booking.slut_tid)),
    lokaleNavn: lokale.navn,
  };
}

// Kvittering til bookeren, og til den lokaleansvarlige, hvor der findes en.
// Kaster ikke: annulleringen står i databasen, uanset om mailene nåede frem.
async function varsl(booking: Booking): Promise<void> {
  try {
    const lokale = findLokale(booking.lokale);
    const ansvarlig = lokale?.ansvarligEmail ?? null;

    const data: MailBooking = {
      lokaleNavn: lokale?.navn ?? booking.lokale,
      naar: tidsrumTekst(new Date(booking.start_tid), new Date(booking.slut_tid)),
      formaal: booking.formaal,
      hold: booking.hold,
      navn: booking.navn,
      email: booking.email,
      mobil: booking.mobil,
      besked: booking.besked,
    };

    const kvittering = egenAflysningTilBooker(data, booking.aflysningsgrund, ansvarlig !== null);

    const udsendelser: Promise<unknown>[] = [
      sendMail({
        til: booking.email,
        emne: kvittering.emne,
        html: kvittering.html,
        tekst: kvittering.tekst,
        svarTil: ansvarlig,
      }),
    ];

    if (ansvarlig) {
      const besked = egenAflysningTilAnsvarlig(data, booking.aflysningsgrund);
      udsendelser.push(
        sendMail({
          til: ansvarlig,
          emne: besked.emne,
          html: besked.html,
          tekst: besked.tekst,
          // Et spørgsmål til annulleringen skal gå direkte til bookeren.
          svarTil: booking.email,
        })
      );
    }

    await Promise.allSettled(udsendelser);
  } catch (e) {
    console.error(
      `Booking ${booking.id} blev annulleret af bookeren, men mailene fejlede: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
