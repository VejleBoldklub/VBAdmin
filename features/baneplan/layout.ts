import type { ScheduleEvent } from "./types";

// Geometri for baneplanens tidsgitter. Højden pr. 15 minutter er
// udgangspunktet for al omregning mellem pixels og tid.
export const ROW_H = 26; // px pr. 15 min
export const TIME_W = 84;
export const HEADER_H = 56;

// Mindste bredde pr. banekolonne. Kolonnerne er fraktionelle og deler den
// tilgængelige bredde ligeligt, så gitteret altid udfylder adminfladen. Denne
// værdi er kun et gulv: er der ikke plads til alle baner, vokser gitteret ud
// over sin beholder, og den vandrette scroll tager over.
//
// Bemærk at banekolonnernes faktiske bredde derfor ikke kan udregnes af denne
// konstant. Skal den kendes — fx til at afgøre hvilken bane en markør er over —
// skal den måles på DOM'en.
//
// Værdien er valgt, så syv baner kan vises uden vandret scroll på en 1280 px
// skærm: 84 + 7 * 160 = 1204 px, mod 1216 px tilgængeligt indhold.
export const MIN_FIELD_W = 160;

// Tildelinger placeres altid på et kvarter. Både træk, ændring af varighed og
// tastaturbetjening runder til nærmeste 15 minutter, så planen ikke ender med
// skæve tider, der ikke kan indtastes i KlubOffice.
export const SNAP = 15;
export const MIN_DURATION = 15;

export function snapTilKvarter(minutter: number): number {
  return Math.round(minutter / SNAP) * SNAP;
}

export type Tidsrum = { start: number; end: number };

// Ny placering når en tildeling trækkes. Varigheden bevares, og tildelingen
// holdes inde i dagens tidsvindue.
//
// Er varigheden længere end vinduet — hvilket kun kan komme fra eksisterende
// data, ikke fra redigering — lægges starten på vinduets begyndelse, og
// tildelingen rager ud i bunden som før. Et træk må ikke forkorte noget.
export function flytTidsrum(
  orig: Tidsrum,
  deltaMinutter: number,
  range: { min: number; max: number }
): Tidsrum {
  const varighed = orig.end - orig.start;
  const start = Math.max(range.min, Math.min(snapTilKvarter(orig.start + deltaMinutter), range.max - varighed));
  return { start, end: start + varighed };
}

// Ny placering når der trækkes i boksens øverste eller nederste kant. Den
// modsatte kant står fast, og varigheden kan ikke komme under MIN_DURATION.
export function aendreVarighed(
  orig: Tidsrum,
  deltaMinutter: number,
  kant: "top" | "bottom",
  range: { min: number; max: number }
): Tidsrum {
  if (kant === "bottom") {
    const end = Math.max(
      orig.start + MIN_DURATION,
      Math.min(snapTilKvarter(orig.end + deltaMinutter), range.max)
    );
    return { start: orig.start, end };
  }
  const start = Math.min(
    orig.end - MIN_DURATION,
    Math.max(snapTilKvarter(orig.start + deltaMinutter), range.min)
  );
  return { start, end: orig.end };
}

// Flyttes en tildeling til en anden dag, kan tidsvinduet være et andet —
// weekender går 09.00-14.00 mod hverdagenes 14.30-21.00. Her forkortes
// tildelingen om nødvendigt, fordi den ellers ville ligge uden for gitteret på
// den dag den landede.
export function tilpasTilDag(tid: Tidsrum, dag: string): Tidsrum {
  const r = rangeForDay(dag);
  const varighed = tid.end - tid.start;
  const start = Math.max(r.min, Math.min(tid.start, r.max - varighed));
  return { start, end: Math.min(start + varighed, r.max) };
}

// Omklædningsrum, der frit kan tildeles, og som indgår i "Ledige omkl."
//
// Rum 7 og 9 er bevidst IKKE med. De er permanent låst til hhv.
// U19 Drenge Ligaen og Kvinde Senior 1 og må aldrig tildeles andre hold —
// heller ikke på dage, hvor det faste hold ikke selv har en tildeling i rummet.
// Udeladelsen her ER implementeringen af den lås. Tilføj dem ikke, selv om de
// optræder i planens data og derfor kan se ud som en forglemmelse.
//
// Rum 11 findes ikke i VB Parken.
export const ALL_ROOMS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

const weekdayMap = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

export function pickInitialDay(availableDays: string[]): string {
  const today = weekdayMap[new Date().getDay()];
  return availableDays.includes(today) ? today : availableDays[0] ?? "Mandag";
}

// Weekender har et andet tidsvindue end hverdage.
export function rangeForDay(day: string) {
  return day === "Lørdag" || day === "Søndag"
    ? { min: 9 * 60, max: 14 * 60 }
    : { min: 14 * 60 + 30, max: 21 * 60 };
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

export type LaidOutEvent = ScheduleEvent & { col: number; cols: number };

// Fordeler tildelinger på en bane i kolonner, så overlappende tildelinger vises
// side om side. Tildelinger, der overlapper direkte eller gennem en kæde af
// overlap, samles i én klynge og deler kolonnebredden.
export function layoutEvents(events: ScheduleEvent[]): LaidOutEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const clusters: { start: number; end: number; events: ScheduleEvent[] }[] = [];

  for (const ev of sorted) {
    const hit = clusters.find((c) => c.events.some((x) => overlaps(x, ev)));
    if (hit) {
      hit.events.push(ev);
      hit.start = Math.min(hit.start, ev.start);
      hit.end = Math.max(hit.end, ev.end);
    } else {
      clusters.push({ start: ev.start, end: ev.end, events: [ev] });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (clusters[i].events.some((a) => clusters[j].events.some((b) => overlaps(a, b)))) {
          clusters[i].events.push(...clusters[j].events);
          clusters[i].start = Math.min(clusters[i].start, clusters[j].start);
          clusters[i].end = Math.max(clusters[i].end, clusters[j].end);
          clusters.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  const out: LaidOutEvent[] = [];
  for (const c of clusters) {
    const cols: ScheduleEvent[][] = [];
    const laidOut: LaidOutEvent[] = [];
    c.events
      .sort((a, b) => a.start - b.start || a.end - b.end)
      .forEach((ev) => {
        let col = 0;
        while (cols[col] && cols[col].some((x) => overlaps(x, ev))) col++;
        (cols[col] ||= []).push(ev);
        laidOut.push({ ...ev, col, cols: 0 }); // cols udfyldes, når klyngens bredde kendes
      });
    for (const ev of laidOut) ev.cols = cols.length;
    out.push(...laidOut);
  }
  return out;
}
