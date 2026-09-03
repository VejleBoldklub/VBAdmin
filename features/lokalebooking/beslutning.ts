import { supabaseAdmin } from "@/lib/supabase-admin";
import { findLokale } from "./lokaler";
import { sendMail } from "./mail";
import {
  aflysningTilBooker,
  beslutningTilBooker,
  serieAflysningTilBooker,
  type MailBooking,
} from "./mail-tekster";
import { tidsrumTekst } from "./regler";
import { erTokenForm, tokenHash } from "./tokens";
import type { BeslutResultat, Booking, BookingStatus } from "./types";

// Selve beslutningen — godkend eller afvis — ét sted, uanset om den kommer fra
// adminfladen eller fra et link i notifikationsmailen.
//
// Delt, fordi de to veje skal gøre nøjagtig det samme mod databasen og sende
// nøjagtig den samme mail til bookeren. Kun hvem der besluttede, er forskelligt,
// og det er præcis hvad besluttet_af er til for.
//
// VIGTIGT: modulet har ikke "use server". Det bruger service_role og skal kun
// kaldes fra serverkode, der selv har afgjort, om kalderen må — enten ved login
// (adminfladen) eller ved et gyldigt token (mail-linket).

export type Beslutning = "godkend" | "afvis";

// Afvisningslinket bruger slet_token_hash.
//
// Kolonnen blev oprindeligt tænkt til bookerens eget slettelink, men det link
// findes ikke endnu, og de to ting kan ikke være i samme kolonne. Skal bookeren
// en dag kunne slette selv, kræver det derfor en ny kolonne — genbrug den ikke
// til begge dele, for så ville et afvisningslink sendt til den cafeteriaansvarlige
// også kunne slette bookingen.
const TOKEN_KOLONNE = {
  godkend: "godkend_token_hash",
  afvis: "slet_token_hash",
} as const;

export type TokenArt = keyof typeof TOKEN_KOLONNE;

const KOLONNER =
  "id,lokale,start_tid,slut_tid,status,formaal,hold,navn,email,mobil,besked," +
  "besluttet_af,besluttet_tid,afvisningsgrund,serie_id,created_at,updated_at";

// Bookingen bag et token, uden at ændre noget. Bruges af siden, mail-linket
// åbner: den skal kunne vise, hvad der skal tages stilling til, før der trykkes.
export async function findBookingViaToken(
  art: TokenArt,
  token: string
): Promise<Booking | null> {
  if (!erTokenForm(token)) return null;

  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .select(KOLONNER)
    .eq(TOKEN_KOLONNE[art], tokenHash(token))
    .maybeSingle();

  if (error) {
    console.error(`Kunne ikke slå booking op via ${art}-token: ${error.message}`);
    return null;
  }

  return (data ?? null) as unknown as Booking | null;
}

const ALLEREDE: Record<BookingStatus, string> = {
  afventer: "Bookingen afventer stadig.",
  bekraeftet: "Bookingen er allerede godkendt.",
  afvist: "Bookingen er allerede afvist.",
  aflyst: "Bookingen er aflyst.",
};

const IKKE_FUNDET = "Bookingen findes ikke længere.";

async function statusFor(kolonne: string, vaerdi: string): Promise<BookingStatus | null> {
  const { data } = await supabaseAdmin
    .from("lokale_bookinger")
    .select("status")
    .eq(kolonne, vaerdi)
    .maybeSingle();

  return ((data as { status: BookingStatus } | null)?.status) ?? null;
}

async function udfoer(
  kolonne: string,
  vaerdi: string,
  beslutning: Beslutning,
  af: "admin" | "mail",
  grund: string | null
): Promise<BeslutResultat> {
  // Betingelsen på status er det, der gør en beslutning endelig. Uanset hvor
  // mange gange et mail-link åbnes, eller hvor mange der trykker samtidig i
  // adminfladen, kan kun det første kald ramme en række.
  //
  // Bemærk, at token-hashen med vilje IKKE nulstilles bagefter. Gjorde den det,
  // kunne linket ikke længere finde bookingen, og et gensyn med mailen ville give
  // "ukendt link" frem for "allerede godkendt". Det er betingelsen her, ikke et
  // slettet token, der forhindrer beslutning nummer to.
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      status: beslutning === "godkend" ? "bekraeftet" : "afvist",
      besluttet_af: af,
      besluttet_tid: new Date().toISOString(),
      afvisningsgrund: beslutning === "afvis" ? grund : null,
    })
    .eq(kolonne, vaerdi)
    .eq("status", "afventer")
    .select(KOLONNER);

  if (error) {
    console.error(`Kunne ikke ${beslutning}e booking (${kolonne}): ${error.message}`);
    return { ok: false, fejl: "Handlingen kunne ikke gennemføres. Prøv igen." };
  }

  const raekker = (data ?? []) as unknown as Booking[];

  if (raekker.length === 0) {
    // Nul rækker betyder enten, at bookingen ikke findes, eller at den allerede
    // er behandlet. Der slås op igen uden statusbetingelsen, så beskeden kan
    // sige hvilken af delene — "allerede godkendt" er til at forstå, "der skete
    // en fejl" er ikke.
    const status = await statusFor(kolonne, vaerdi);
    return { ok: false, fejl: status ? ALLEREDE[status] : IKKE_FUNDET };
  }

  await varslBooker(raekker[0]);

  return { ok: true };
}

// Mailen til bookeren om udfaldet. Fejler den, står beslutningen stadig — den er
// truffet og skrevet i databasen, og en manglende mail må ikke lave den om.
async function varslBooker(booking: Booking): Promise<void> {
  try {
    const lokale = findLokale(booking.lokale);

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

    // Reply-To er den lokaleansvarlige, hvor der findes en. For cafeteriet er det
    // cafeteria@vejleboldklub.dk, og netop denne mail er den, hvor det betyder
    // noget: det er her, en træner kan få et afslag og have brug for at spørge
    // hvorfor. Et svar skal lande hos den, der traf beslutningen, ikke i
    // afsenderpostkassen.
    //
    // Mødelokalet har ingen ansvarlig og bliver aldrig afvist. Der sættes ingen
    // Reply-To, og mailen lover så heller ikke, at man kan svare.
    const svarTil = lokale?.ansvarligEmail ?? null;

    const indhold =
      booking.status === "aflyst"
        ? aflysningTilBooker(data, svarTil !== null)
        : beslutningTilBooker(
            data,
            booking.status === "bekraeftet" ? "godkendt" : "afvist",
            booking.afvisningsgrund,
            svarTil !== null
          );

    await sendMail({
      til: booking.email,
      emne: indhold.emne,
      html: indhold.html,
      tekst: indhold.tekst,
      svarTil,
    });
  } catch (e) {
    console.error(
      `Beslutningen om booking ${booking.id} blev gemt, men mailen til bookeren fejlede: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

export async function afgoerViaId(
  id: string,
  beslutning: Beslutning,
  grund: string | null
): Promise<BeslutResultat> {
  return udfoer("id", id, beslutning, "admin", grund);
}

// Annullering fra adminfladen af en booking, der ikke er behandlet endnu, eller
// som allerede står som bekræftet.
//
// Status bliver 'aflyst', ikke 'afvist'. De to er ikke det samme: 'afvist' er
// svaret på en cafeteria-forespørgsel, som aldrig blev til noget, mens 'aflyst'
// er en booking, klubben tager tilbage. Forskellen kan læses i adminlisten
// bagefter, og den er væk, hvis begge dele hedder det samme.
//
// Begge de aktive statusser kan annulleres, men ikke en booking, der allerede er
// afvist eller aflyst — der er ikke noget at tage tilbage, og et andet svar til
// bookeren ville kun forvirre.
//
// afvisningsgrund røres ikke. Feltet hører til et afslag, og en annullering har
// ikke en grund, der er tastet ind nogen steder.
export async function aflysViaId(id: string): Promise<BeslutResultat> {
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      status: "aflyst",
      besluttet_af: "admin",
      besluttet_tid: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["afventer", "bekraeftet"])
    .select(KOLONNER);

  if (error) {
    console.error(`Kunne ikke annullere booking ${id}: ${error.message}`);
    return { ok: false, fejl: "Handlingen kunne ikke gennemføres. Prøv igen." };
  }

  const raekker = (data ?? []) as unknown as Booking[];

  if (raekker.length === 0) {
    const status = await statusFor("id", id);
    return {
      ok: false,
      fejl: status ? ALLEREDE[status] : IKKE_FUNDET,
    };
  }

  // Tidsrummet er ledigt igen i samme øjeblik: udelukkelsesreglen dækker kun
  // afventende og bekræftede bookinger.
  await varslBooker(raekker[0]);

  return { ok: true };
}

export async function afgoerViaToken(
  art: TokenArt,
  token: string,
  grund: string | null
): Promise<BeslutResultat> {
  if (!erTokenForm(token)) {
    return { ok: false, fejl: "Linket er ikke gyldigt." };
  }

  const beslutning: Beslutning = art === "godkend" ? "godkend" : "afvis";
  return udfoer(TOKEN_KOLONNE[art], tokenHash(token), beslutning, "mail", grund);
}

// Aflysning af en hel serie på én gang.
//
// Samme opdatering som aflysViaId, blot betinget af serie_id frem for id. Der er
// med vilje ingen sletning: bookingerne får status 'aflyst', tidsrummene bliver
// ledige, og rækkerne bliver stående, så det bagefter kan ses i listen, at
// klubben tog rækken tilbage. Det er det samme valg som for enkeltbookinger.
//
// Betingelsen på status gør, at en forekomst, der allerede er aflyst enkeltvis,
// ikke bliver rørt igen — og at to administratorer, der trykker samtidig, ikke
// begge kan udløse en mail.
export async function aflysSerieViaId(serieId: string): Promise<BeslutResultat> {
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .update({
      status: "aflyst",
      besluttet_af: "admin",
      besluttet_tid: new Date().toISOString(),
    })
    .eq("serie_id", serieId)
    .in("status", ["afventer", "bekraeftet"])
    .select(KOLONNER);

  if (error) {
    console.error(`Kunne ikke aflyse serie ${serieId}: ${error.message}`);
    return { ok: false, fejl: "Handlingen kunne ikke gennemføres. Prøv igen." };
  }

  const raekker = (data ?? []) as unknown as Booking[];

  if (raekker.length === 0) {
    return {
      ok: false,
      fejl: "Der er ingen aktive bookinger tilbage i serien. Genindlæs siden.",
    };
  }

  await varslOmAflystSerie(raekker);

  return { ok: true };
}

// Én mail om hele serien frem for én pr. aflyst dato. Tyve enslydende mails om
// den samme beslutning er ikke tyve gange så tydeligt — det er støj, og de sidste
// bliver ikke læst.
//
// Der grupperes på mailadresse, selv om alle bookinger i en serie er oprettet i
// én formular med én adresse. Det koster ingenting, og det gør funktionen
// uafhængig af den antagelse, hvis serier en dag kan sættes sammen på anden vis.
async function varslOmAflystSerie(raekker: Booking[]): Promise<void> {
  try {
    const sorteret = [...raekker].sort(
      (a, b) => new Date(a.start_tid).getTime() - new Date(b.start_tid).getTime()
    );

    const prModtager = new Map<string, Booking[]>();
    for (const r of sorteret) {
      const liste = prModtager.get(r.email) ?? [];
      liste.push(r);
      prModtager.set(r.email, liste);
    }

    const udsendelser = [...prModtager.values()].map(async (mine) => {
      const foerste = mine[0];
      const lokale = findLokale(foerste.lokale);
      const svarTil = lokale?.ansvarligEmail ?? null;

      const data: MailBooking = {
        lokaleNavn: lokale?.navn ?? foerste.lokale,
        naar: tidsrumTekst(new Date(foerste.start_tid), new Date(foerste.slut_tid)),
        formaal: foerste.formaal,
        hold: foerste.hold,
        navn: foerste.navn,
        email: foerste.email,
        mobil: foerste.mobil,
        besked: foerste.besked,
      };

      const indhold = serieAflysningTilBooker(
        data,
        mine.map((r) => tidsrumTekst(new Date(r.start_tid), new Date(r.slut_tid))),
        svarTil !== null
      );

      await sendMail({
        til: foerste.email,
        emne: indhold.emne,
        html: indhold.html,
        tekst: indhold.tekst,
        svarTil,
      });
    });

    // allSettled: den ene modtagers mail må ikke afhænge af den andens.
    await Promise.allSettled(udsendelser);
  } catch (e) {
    console.error(
      `En serie blev aflyst, men mailen til bookeren fejlede: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
