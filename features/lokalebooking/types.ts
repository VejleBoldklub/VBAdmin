import type { LokaleSlug } from "./lokaler";

export type BookingStatus = "afventer" | "bekraeftet" | "afvist" | "aflyst";

// En booking som den ser ud i adminfladen, altså med kontaktoplysninger.
// Læses kun med service_role bag login.
export type Booking = {
  id: string;
  lokale: LokaleSlug;
  // ISO 8601 med tidszone, som Supabase returnerer timestamptz.
  start_tid: string;
  slut_tid: string;
  status: BookingStatus;
  formaal: string;
  // Frit tekstfelt, valgfrit. Tom indtastning gemmes som null, ikke "".
  hold: string | null;
  navn: string;
  email: string;
  mobil: string;
  besked: string | null;
  besluttet_af: "mail" | "admin" | null;
  besluttet_tid: string | null;
  afvisningsgrund: string | null;
  // Sat, hvis bookingen er én forekomst i en gentagen serie. Alle bookinger i
  // samme serie deler værdien; null på alt andet. Se features/lokalebooking/serie.ts.
  serie_id: string | null;
  created_at: string;
  updated_at: string;
};

// Optagethed som den offentlige side viser den.
//
// BEMÆRK: denne type indeholder persondata, og den bruges på en side uden login.
// Det er et bevidst valg truffet af klubben: trænere skal kunne se i kalenderen,
// hvem der har booket, og hvad lokalet skal bruges til, uden først at logge ind.
//
// E-mailadressen er med vilje IKKE med. Navn og mobil er nok til at fange den,
// der har lokalet, mens en mailadresse i en offentlig side er det, adressehøstere
// leder efter. Den bliver stående i databasen og bruges server-side til
// kvitteringer og godkendelsesmails — den forlader bare aldrig serveren mod
// browseren. Tilføjes den her igen, ryger den med i sidens data, uanset om noget
// tegner den.
//
// Det var ikke sådan modulet blev bygget. Oprindeligt læste den offentlige side
// viewet lokale_optagethed, som kun indeholder tidsrum og status, netop for at
// kontaktoplysninger ikke kunne slippe ud. Ændres beslutningen igen, er vejen
// tilbage at læse viewet frem for tabellen i optagethed.ts — resten kan blive
// stående.
export type Optagethed = {
  lokale: LokaleSlug;
  start_tid: string;
  slut_tid: string;
  status: Extract<BookingStatus, "afventer" | "bekraeftet">;
  formaal: string;
  hold: string | null;
  navn: string;
  mobil: string;
};

// Hvor stor en serie er, og hvor meget af den der stadig gælder.
//
// Adminlisten viser kun de bookinger, filtrene slipper igennem, og en serie kan
// sagtens række ud over dem: en filtreret uge kan indeholde tre af tolv tirsdage.
// Skal en knap kunne sige "aflys hele serien (12 bookinger)", er tallet nødt til
// at komme fra et selvstændigt opslag — ellers ville den love at aflyse tre og
// aflyse tolv.
//
// Typen ligger HER og ikke i bookinger.ts, selv om det er den fil, der henter
// tallene. Knappen, der bruger dem, er en klientkomponent, og bookinger.ts
// importerer service_role-klienten — samme fælde som beskrevet i lib/moduler.ts.
export type SerieOverblik = {
  // Alle bookinger i serien, uanset status.
  ialt: number;
  // Dem, der stadig holder tid: afventende og bekræftede. Det er dem, en samlet
  // aflysning vil ramme.
  aktive: number;
  foersteDag: string;
  sidsteDag: string;
};

// Overblikket plus det mærke, listen sætter på rækkerne — "A", "B" og så videre.
//
// Mærket er ikke gemt nogen steder og skal ikke være det. Det er en etiket, der
// kun har betydning inden for den liste, man kigger på: to serier på skærmen skal
// kunne kendes fra hinanden, og et UUID er ikke noget, et menneske kan se forskel
// på i en tabel. Filtreres listen anderledes, kan den samme serie få et andet
// bogstav, og det gør ingen skade — mærket bruges aldrig til at slå noget op.
export type SerieVisning = SerieOverblik & { id: string; maerke: string };

// Filtrene på adminoversigten. Ligger i URL'en, så en filtreret liste kan deles
// og genindlæses uden at ende et andet sted.
//
// "alle" er en egen værdi frem for undefined, fordi filtret så kan læses og
// skrives ét sted uden at skulle skelne mellem "ikke valgt" og "alle valgt".
export type BookingFilter = {
  lokale: LokaleSlug | "alle";
  status: BookingStatus | "alle";
  // Kommende viser bookinger, der ikke er afholdt endnu, og er standard. Uden den
  // ville listen begynde med den ældste booking nogensinde og skubbe det, der
  // faktisk skal handles på, ud af syne.
  periode: "kommende" | "alle";
};

// Svaret fra en godkendelse eller en afvisning.
//
// Handlingerne kaster ikke ved fejl, som baneplanens gør. En kastet fejl i en
// server action rammer fejlgrænsen og river hele siden ned, og en administrator,
// der trykker Afvis på en booking, en anden lige har godkendt, skal have en
// forklaring frem for en fejlside.
export type BeslutResultat = { ok: true } | { ok: false; fejl: string };

// Samme svar, men i den form useActionState har brug for: en tilstand, før der
// er trykket på noget. Bruges af siderne, mail-linkene åbner.
export type BeslutSvar =
  | { tilstand: "uroert" }
  | { tilstand: "ok" }
  | { tilstand: "fejl"; fejl: string };

// Det en bruger indtaster. Tokens, status og beslutningsfelter er ikke med —
// de sættes af serverkode eller af databasen, og rækkesikkerheden afviser
// oprettelser, hvor de er udfyldt.
export type NyBooking = {
  lokale: LokaleSlug;
  start_tid: string;
  slut_tid: string;
  formaal: string;
  hold: string | null;
  navn: string;
  email: string;
  mobil: string;
  besked: string | null;
};
