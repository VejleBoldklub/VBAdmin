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
  created_at: string;
  updated_at: string;
};

// Optagethed som den offentlige side viser den.
//
// BEMÆRK: denne type indeholder persondata, og den bruges på en side uden login.
// Det er et bevidst valg truffet af klubben: trænere skal kunne se i kalenderen,
// hvem der har booket, og hvad lokalet skal bruges til, uden først at logge ind.
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
  email: string;
  mobil: string;
};

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
