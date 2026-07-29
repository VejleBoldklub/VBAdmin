"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { supabasePublic } from "@/lib/supabase-public";
import { HONEYPOT, type Indtastning, type OpretResultat } from "./formular";
import { ipHash, ManglerSalt } from "./ip";
import { findLokale, startStatus } from "./lokaler";
import {
  danskTidTilInstant,
  minutterFraTekst,
  REGELBRUD_TEKST,
  tidsrumTekst,
  tjekTidsrum,
} from "./regler";

// Oprettelse af en booking fra den offentlige rute.
//
// Bemærk hvad denne fil IKKE er: den er ikke stedet, hvor bookingreglerne
// håndhæves. Det gør databasen — udelukkelsesreglen, check-reglerne og
// rækkesikkerhedspolicyen i supabase/lokalebooking-skema.sql. Kontrollerne her
// findes for at kunne give brugeren en forståelig besked frem for en rå
// databasefejl, og fordi et afvist forsøg ikke skal koste en tur til databasen.
//
// Enhver, der kender anon-nøglen, kan springe denne fil over og kalde API'et
// direkte. Det er derfor spærrerne skal ligge i databasen, og det er derfor de to
// sæt regler skal holdes i takt.

// Pr. IP pr. time. Højere end funktionens egen default på fem, fordi klubbens
// medlemmer booker fra samme net: i klubhuset kommer alle ud gennem én adresse,
// og fem ville ramme en helt almindelig aften, hvor tre personer booker hver sin
// tid. Kan sættes ned, hvis der viser sig at komme spam.
const MAKS_FORSOEG_PR_TIME = 10;

// Samme mønster som check-reglen i databasen. Bevidst løs: formålet er at fange
// tastefejl, ikke at afgøre om en adresse findes.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function tekst(fd: FormData, navn: string): string {
  const v = fd.get(navn);
  return typeof v === "string" ? v.trim() : "";
}

function laesIndtastning(fd: FormData): Indtastning {
  return {
    dato: tekst(fd, "dato"),
    start: tekst(fd, "start"),
    slut: tekst(fd, "slut"),
    formaal: tekst(fd, "formaal"),
    hold: tekst(fd, "hold"),
    navn: tekst(fd, "navn"),
    email: tekst(fd, "email"),
    mobil: tekst(fd, "mobil"),
    besked: tekst(fd, "besked"),
  };
}

// Længderne er de samme som check-reglerne i skemaet. Er de to uenige, vinder
// databasen, og brugeren får en generisk fejl i stedet for en brugbar — derfor
// skal de holdes ens.
function tjekFelter(v: Indtastning): string[] {
  const fejl: string[] = [];

  if (v.formaal.length < 1) fejl.push("Skriv hvad lokalet skal bruges til.");
  else if (v.formaal.length > 200) fejl.push("Formålet må højst være 200 tegn.");

  if (v.hold.length > 100) fejl.push("Hold må højst være 100 tegn.");

  if (v.navn.length < 2) fejl.push("Skriv dit navn.");
  else if (v.navn.length > 100) fejl.push("Navnet må højst være 100 tegn.");

  if (!EMAIL.test(v.email)) fejl.push("Skriv en gyldig e-mailadresse.");

  if (v.mobil.length < 6 || v.mobil.length > 20) fejl.push("Skriv et mobilnummer.");

  if (v.besked.length > 2000) fejl.push("Beskeden må højst være 2000 tegn.");

  return fejl;
}

export async function opretBooking(
  slug: string,
  _forrige: OpretResultat,
  fd: FormData
): Promise<OpretResultat> {
  const vaerdier = laesIndtastning(fd);
  const generisk = "Bookingen kunne ikke oprettes. Prøv igen, eller ring til klubben.";

  const lokale = findLokale(slug);
  if (!lokale) {
    // Slug'en er bundet på serveren, ikke sendt med formularen, så det her sker
    // kun ved en programmeringsfejl.
    console.error(`Ukendt lokale i opretBooking: ${slug}`);
    return { tilstand: "fejl", fejl: [generisk], vaerdier };
  }

  const feltfejl = tjekFelter(vaerdier);

  const startMin = minutterFraTekst(vaerdier.start);
  const slutMin = minutterFraTekst(vaerdier.slut);
  const gyldigDato = /^\d{4}-\d{2}-\d{2}$/.test(vaerdier.dato);

  if (!gyldigDato || startMin === null || slutMin === null) {
    feltfejl.push("Vælg dato, start og slut.");
    return { tilstand: "fejl", fejl: feltfejl, vaerdier };
  }

  const start = danskTidTilInstant(vaerdier.dato, startMin);
  const slut = danskTidTilInstant(vaerdier.dato, slutMin);

  for (const brud of tjekTidsrum(start, slut, new Date())) {
    feltfejl.push(REGELBRUD_TEKST[brud]);
  }

  // Forsøgstællingen sker først her, efter at alt det, der kan afgøres uden
  // databasen, er afgjort. En bruger, der taster forkert tre gange, skal ikke
  // brænde sin kvote på det.
  if (feltfejl.length > 0) {
    return { tilstand: "fejl", fejl: feltfejl, vaerdier };
  }

  // Honeypot: udfyldt felt får et tavst ja.
  //
  // Svaret er ikke til at skelne fra en rigtig oprettelse — samme kvittering,
  // samme tidsrum, et id af samme form. En robot får altså intet at vide om, hvad
  // der afslørede den, og kan ikke prøve sig frem til en formulering, der slipper
  // igennem. Et tydeligt afslag ville være et signal at optimere efter.
  //
  // Kontrollen ligger EFTER valideringen med vilje. Består indtastningen ikke
  // reglerne, skal svaret være de samme fejl som for alle andre — ellers ville et
  // tavst ja på en ugyldig indtastning netop afsløre fælden. Og den ligger før
  // ethvert databasekald: der indsættes hverken en booking eller et forsøg, så
  // spam koster os ingenting.
  //
  // Prisen er kendt og accepteret: rammer en adgangskodeudfylder en dag det
  // skjulte felt, får et rigtigt medlem en bekræftelse på en booking, der ikke
  // findes. Loggen er det eneste sted, det kan opdages — hold øje med linjen her,
  // hvis nogen melder om en booking, klubben ikke kan se.
  if (tekst(fd, HONEYPOT) !== "") {
    console.warn(
      `Bookingforsøg med udfyldt honeypot fik et tavst ja (${lokale.slug}, ${vaerdier.email}).`
    );
    return {
      tilstand: "ok",
      id: randomUUID(),
      status: startStatus(lokale),
      naar: tidsrumTekst(start, slut),
      lokaleNavn: lokale.navn,
    };
  }

  let hash: string;
  try {
    hash = await ipHash();
  } catch (e) {
    if (e instanceof ManglerSalt) {
      console.error(`${e.message} Bookinger afvises, indtil variablen er sat.`);
    } else {
      console.error(`Kunne ikke beregne IP-hash: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { tilstand: "fejl", fejl: [generisk], vaerdier };
  }

  const klient = supabasePublic();

  const { data: maaFortsaette, error: forsoegFejl } = await klient.rpc(
    "registrer_bookingforsoeg",
    { p_ip_hash: hash, p_maks: MAKS_FORSOEG_PR_TIME }
  );

  if (forsoegFejl) {
    console.error(`Kunne ikke registrere bookingforsøg: ${forsoegFejl.message}`);
    return { tilstand: "fejl", fejl: [generisk], vaerdier };
  }

  if (maaFortsaette === false) {
    return {
      tilstand: "fejl",
      fejl: [
        "Der er oprettet mange bookinger fra dette netværk den seneste time. Prøv igen senere, eller ring til klubben.",
      ],
      vaerdier,
    };
  }

  // Id'et genereres her, ikke af databasen. Anon har ingen select-rettighed på
  // lokale_bookinger, og "Prefer: return=representation" ville derfor fejle —
  // se begrundelsen ved grant insert i supabase/lokalebooking-skema.sql. Id'et
  // skal bruges til slet- og godkendelseslinkene i mailene (næste PR).
  const id = randomUUID();
  const status = startStatus(lokale);

  // Kun de kolonner, anon har rettighed til. Token- og beslutningsfelter er ikke
  // med og kan ikke være med: rettigheden findes ikke, og policyen kræver dem
  // null. Tomme valgfrie felter sendes som null, ikke som "".
  const { error } = await klient.from("lokale_bookinger").insert({
    id,
    lokale: lokale.slug,
    start_tid: start.toISOString(),
    slut_tid: slut.toISOString(),
    status,
    formaal: vaerdier.formaal,
    hold: vaerdier.hold === "" ? null : vaerdier.hold,
    navn: vaerdier.navn,
    email: vaerdier.email,
    mobil: vaerdier.mobil,
    besked: vaerdier.besked === "" ? null : vaerdier.besked,
  });

  if (error) {
    // 23P01 er udelukkelsesreglen. Den er ikke en fejl i brugerens indtastning,
    // men et kapløb: tidsrummet var ledigt, da ugen blev tegnet, og blev taget,
    // mens formularen blev udfyldt.
    if (error.code === "23P01") {
      return {
        tilstand: "fejl",
        fejl: [
          "Tidsrummet blev booket af en anden, mens du udfyldte formularen. Vælg et andet tidsrum.",
        ],
        vaerdier,
      };
    }

    // Alt andet er en uenighed mellem denne fil og databasen: en check-regel
    // (23514) eller en afvisning fra rækkesikkerheden og de kolonnebegrænsede
    // rettigheder (42501). Brugeren kan ikke gøre noget ved det, men det skal
    // kunne ses i loggen, for det betyder at de to sæt regler er kommet ud af takt.
    console.error(
      `Bookingen blev afvist af databasen (${error.code ?? "ukendt"}): ${error.message}`
    );
    return { tilstand: "fejl", fejl: [generisk], vaerdier };
  }

  // Får ugevisningen til at vise den nye booking. Uden dette kald sender Next
  // ikke et nyt servergengivet træ tilbage efter handlingen, og brugeren ville se
  // sit eget tidsrum stå som ledigt.
  revalidatePath(`/lokalebooking/${lokale.slug}`);

  return {
    tilstand: "ok",
    id,
    status,
    naar: tidsrumTekst(start, slut),
    lokaleNavn: lokale.navn,
  };
}
