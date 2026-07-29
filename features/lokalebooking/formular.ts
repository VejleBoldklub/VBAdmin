import type { BookingStatus } from "./types";

// Formularens form, delt mellem serverhandlingen og brugerfladen.
//
// Ligger i sin egen fil, fordi opret.ts er en "use server"-fil, og et sådant
// modul kun må eksportere asynkrone funktioner. En konstant eller et objekt
// derinde ville få `next build` til at fejle. Klientkoden har brug for begge, så
// de hører her.

// Feltet er skjult for mennesker og udfyldes kun af robotter, der udfylder alt.
// Navnet er valgt, fordi det ser ud som et felt, der er værd at udfylde.
export const HONEYPOT = "hjemmeside";

export type Indtastning = {
  // "ÅÅÅÅ-MM-DD", som et date-felt afleverer det.
  dato: string;
  // Minutter siden midnat som tekst. Formularen sender minutter frem for
  // klokketider, så der ikke skal fortolkes tekst på vej ind.
  start: string;
  slut: string;
  formaal: string;
  hold: string;
  navn: string;
  email: string;
  mobil: string;
  besked: string;
};

export type OpretResultat =
  | { tilstand: "uroert" }
  | { tilstand: "ok"; id: string; status: BookingStatus; naar: string; lokaleNavn: string }
  // Indtastningen sendes tilbage, fordi React nulstiller formularen, når en
  // server action er kørt. Efter hydrering holder brugerfladen selv styr på
  // felterne, men bliver formularen sendt inden da, er dette det eneste, der kan
  // fylde dem ud igen.
  | { tilstand: "fejl"; fejl: string[]; vaerdier: Indtastning };

export const TOM_INDTASTNING: Indtastning = {
  dato: "",
  start: "",
  slut: "",
  formaal: "",
  hold: "",
  navn: "",
  email: "",
  mobil: "",
  besked: "",
};
