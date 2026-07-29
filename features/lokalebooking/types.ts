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

// Optagethed som den offentlige side ser den: ingen persondata.
//
// Svarer til viewet lokale_optagethed i supabase/lokalebooking-skema.sql, som er
// det eneste anon-nøglen kan læse. Typen er bevidst snæver, så en fejl i
// serverkoden ikke kan sende kontaktoplysninger til den offentlige rute.
export type Optagethed = {
  lokale: LokaleSlug;
  start_tid: string;
  slut_tid: string;
  status: Extract<BookingStatus, "afventer" | "bekraeftet">;
};

// Det en bruger indtaster. Tokens, status og beslutningsfelter er ikke med —
// de sættes af serverkode eller af databasen, og rækkesikkerheden afviser
// oprettelser, hvor de er udfyldt.
export type NyBooking = {
  lokale: LokaleSlug;
  start_tid: string;
  slut_tid: string;
  formaal: string;
  navn: string;
  email: string;
  mobil: string;
  besked: string | null;
};
