import type { ScheduleEvent } from "./types";

// Geometri for baneplanens tidsgitter. Højden pr. 15 minutter er
// udgangspunktet for al omregning mellem pixels og tid.
export const ROW_H = 26; // px pr. 15 min
export const TIME_W = 84;
export const FIELD_W = 170;
export const HEADER_H = 56;

// Omklædningsrum, der indgår i beregningen af ledige rum.
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
