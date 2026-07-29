// Ugeberegning til ugevisningen.
//
// Ugen er nøglen til hele den offentlige rute: den står i URL'en som ?uge=2026-W32,
// så et link kan deles og deles igen, og så navigation frem og tilbage ikke
// kræver klientkode.
//
// Al regning sker på datoer som tekst, "ÅÅÅÅ-MM-DD", læst som UTC-midnat. Det er
// bevidst: her regnes på kalenderen, ikke på tidslinjen. Læste vi datoerne i
// dansk tid, ville hver eneste udregning skulle tage højde for sommertid, selv om
// spørgsmålet "hvilken mandag hører den 5. august til?" ikke har noget med
// tidszoner at gøre. Den dato, der begyndes med, kommer fra danskTid(), så det er
// den danske kalenderdag, der regnes videre på.

import { danskTid, TIDSZONE } from "./regler";

const DAG = 86_400_000;

function isoDato(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function tilMs(dato: string): number {
  const ms = Date.parse(`${dato}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Ugyldig dato: ${dato}`);
  return ms;
}

// 1 = mandag ... 7 = søndag, som Postgres' isodow og som DanskTid.isoDag.
export function isoDagFor(dato: string): number {
  const dag = new Date(tilMs(dato)).getUTCDay();
  return dag === 0 ? 7 : dag;
}

function mandagIUgen(ms: number): number {
  const dag = new Date(ms).getUTCDay();
  const isoDag = dag === 0 ? 7 : dag;
  return ms - (isoDag - 1) * DAG;
}

// ISO 8601-ugenummeret. Ugen hører til det år, dens torsdag ligger i — derfor kan
// 1. januar godt ligge i uge 52 af året før.
function ugeNummer(mandag: number): { aar: number; nr: number } {
  const torsdag = mandag + 3 * DAG;
  const aar = new Date(torsdag).getUTCFullYear();

  // Den 4. januar ligger altid i uge 1, uanset hvilken ugedag den falder på.
  const uge1Mandag = mandagIUgen(tilMs(`${aar}-01-04`));

  return { aar, nr: Math.round((mandag - uge1Mandag) / (7 * DAG)) + 1 };
}

export function ugeNoegleForDato(dato: string): string {
  const { aar, nr } = ugeNummer(mandagIUgen(tilMs(dato)));
  return `${aar}-W${String(nr).padStart(2, "0")}`;
}

// Ugen som `nu` ligger i, bedømt i dansk tid. Kl. 23.30 en søndag i dansk tid er
// stadig samme uge, selv om det er mandag i UTC.
export function ugeNoegleNu(nu: Date): string {
  return ugeNoegleForDato(danskTid(nu).dato);
}

// Mandagen i en ugenøgle, eller null hvis nøglen ikke er en gyldig uge.
//
// Nøglen kommer fra URL'en og kan derfor være hvad som helst. Kontrollen til
// sidst er ikke overflødig: 2026-W53 ser velformet ud, men 2026 har kun 52 uger,
// og uden kontrollen ville nøglen tavst blive uge 1 i 2027.
export function mandagForUge(noegle: string): string | null {
  const fundet = /^(\d{4})-W(\d{2})$/.exec(noegle);
  if (!fundet) return null;

  const aar = Number(fundet[1]);
  const nr = Number(fundet[2]);
  if (nr < 1 || nr > 53) return null;

  const uge1Mandag = mandagIUgen(tilMs(`${aar}-01-04`));
  const mandag = isoDato(uge1Mandag + (nr - 1) * 7 * DAG);

  return ugeNoegleForDato(mandag) === noegle ? mandag : null;
}

export function ugensDatoer(mandag: string): string[] {
  const start = tilMs(mandag);
  return Array.from({ length: 7 }, (_, i) => isoDato(start + i * DAG));
}

export function naboUge(noegle: string, uger: number): string {
  const mandag = mandagForUge(noegle);
  if (!mandag) throw new Error(`Ugyldig ugenøgle: ${noegle}`);
  return ugeNoegleForDato(isoDato(tilMs(mandag) + uger * 7 * DAG));
}

const DAGNAVN = new Intl.DateTimeFormat("da-DK", { weekday: "short", timeZone: "UTC" });
const DAGTAL = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", timeZone: "UTC" });
const DAG_MAANED = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const FULD = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Formateringen sker i UTC, fordi datoerne ER UTC-midnat her. Med TIDSZONE ville
// en dato blive vist som dagen før i vinterhalvåret.
export function dagNavn(dato: string): string {
  return DAGNAVN.format(tilMs(dato)).replace(".", "");
}

export function dagTal(dato: string): string {
  return DAGTAL.format(tilMs(dato));
}

export function ugeTitel(noegle: string): string {
  const mandag = mandagForUge(noegle);
  if (!mandag) return "Ukendt uge";

  const datoer = ugensDatoer(mandag);
  const nr = Number(noegle.slice(-2));

  return `Uge ${nr} · ${DAG_MAANED.format(tilMs(datoer[0]))} – ${FULD.format(tilMs(datoer[6]))}`;
}

// Om en dato er i dag i dansk tid, til at fremhæve dagens søjle.
export function erIDag(dato: string, nu: Date): boolean {
  return danskTid(nu).dato === dato;
}

// Findes for at gøre det tydeligt, at ugevisningen viser dansk tid, også når den
// bruges fra en anden tidszone.
export const VISNINGSTIDSZONE = TIDSZONE;
