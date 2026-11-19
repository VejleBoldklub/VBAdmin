// Hvad må vises lige nu?
//
// Ligger for sig selv og uden importer ud over typerne, fordi både playeren i
// browseren og adminfladens oversigt bruger den. Playeren regner selv efter,
// hvert minut, så et element med et tidsvindue starter og stopper til tiden —
// også mellem to hentninger af playlisten.
//
// Alle tider er danske, uanset hvor skærmen eller serveren står.
import type { Element, Skaerm } from "./typer";

export type DanskTid = { dato: string; ugedag: number; minut: number };

export function danskTid(nu: Date = new Date()): DanskTid {
  const dele = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(nu);

  const del = (t: string) => dele.find((d) => d.type === t)?.value ?? "";
  const ugedage: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  return {
    dato: `${del("year")}-${del("month")}-${del("day")}`,
    ugedag: ugedage[del("weekday")] ?? 1,
    minut: Number(del("hour")) * 60 + Number(del("minute")),
  };
}

function minutter(tid: string): number {
  const [t, m] = tid.split(":").map(Number);
  return t * 60 + m;
}

// fra > til betyder hen over midnat, fx 22:00–06:00.
export function iTidsrum(minut: number, fra: string | null, til: string | null): boolean {
  if (!fra && !til) return true;
  const f = fra ? minutter(fra) : 0;
  const t = til ? minutter(til) : 24 * 60;
  if (f === t) return true;
  return f < t ? minut >= f && minut < t : minut >= f || minut < t;
}

export function elementVisesNu(e: Element, tid: DanskTid): boolean {
  if (!e.aktiv) return false;
  if (e.fraDato && tid.dato < e.fraDato) return false;
  if (e.tilDato && tid.dato > e.tilDato) return false;
  if (!e.ugedage.includes(tid.ugedag)) return false;
  return iTidsrum(tid.minut, e.fraTid, e.tilTid);
}

export function skaermTaendt(s: Skaerm, tid: DanskTid): boolean {
  return s.aktiv && iTidsrum(tid.minut, s.taendFra, s.taendTil);
}

// En kort, læsbar beskrivelse af et elements plan til listen i adminfladen.
export function beskrivPlan(e: Element): string {
  const dele: string[] = [];
  const kort = ["", "man", "tir", "ons", "tor", "fre", "lør", "søn"];

  if (e.fraDato || e.tilDato) {
    const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
    if (e.fraDato && e.tilDato) dele.push(`${fmt(e.fraDato)}–${fmt(e.tilDato)}`);
    else if (e.fraDato) dele.push(`fra ${fmt(e.fraDato)}`);
    else if (e.tilDato) dele.push(`til ${fmt(e.tilDato!)}`);
  }

  if (e.ugedage.length < 7) {
    const sorteret = [...e.ugedage].sort();
    const hverdage = sorteret.join() === "1,2,3,4,5";
    const weekend = sorteret.join() === "6,7";
    dele.push(hverdage ? "hverdage" : weekend ? "weekend" : sorteret.map((d) => kort[d]).join(", "));
  }

  if (e.fraTid || e.tilTid) dele.push(`kl. ${e.fraTid ?? "00:00"}–${e.tilTid ?? "24:00"}`);

  return dele.length ? dele.join(" · ") : "Altid";
}
