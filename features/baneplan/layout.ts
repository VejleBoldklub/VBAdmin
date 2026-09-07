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

// Finder det første ledige tidsrum til en ny tildeling, så knappen ikke lægger
// alt oven i hinanden. Banerne gennemgås i rækkefølge, og for hver bane
// kvarterene fra dagens begyndelse, så en ny tildeling lander så tidligt og så
// langt til venstre som muligt.
//
// Returnerer null, hvis der ikke er plads nogen steden. Kalderen må så placere
// tildelingen oven i en anden — overlap er tilladt i en baneplan, men det skal
// ikke være det man får uden at bede om det.
export function foersteLedigePlads(
  optagede: { field: string; start: number; end: number }[],
  baner: string[],
  range: { min: number; max: number },
  varighed: number
): { field: string; start: number; end: number } | null {
  for (const field of baner) {
    const paaBanen = optagede.filter((e) => e.field === field);
    for (let start = range.min; start + varighed <= range.max; start += SNAP) {
      const kandidat = { start, end: start + varighed };
      if (!paaBanen.some((e) => overlaps(e, kandidat))) return { field, ...kandidat };
    }
  }
  return null;
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

// Tildelingerne på en dag, afgrænset til dagens tidsvindue. Samme filter i
// editoren, den læsende visning og printvisningen, så de tre ikke kan komme til
// at vise hver sit udsnit af planen.
export function tildelingerPaaDag(events: ScheduleEvent[], day: string): ScheduleEvent[] {
  const range = rangeForDay(day);
  return events.filter((e) => e.day === day && e.end > range.min && e.start < range.max);
}

// Banernes rækkefølge i planens data ER kolonnernes rækkefølge i skemaet. Både
// kladdens editor og den offentlige visning tegner deres kolonner ved at løbe
// fields igennem i rækkefølge, så en omrokering er ganske enkelt en flytning i
// den liste. Der er derfor ikke — og skal ikke være — et selvstændigt
// rækkefølgefelt, der kan komme ud af trit med listen.
//
// Tildelinger peger på deres bane ved navn, ikke ved kolonneposition, så de
// følger med af sig selv, når banerne bytter plads.

// Flytter elementet på plads `fra` hen til indsætningspunktet `indsaetVed`.
//
// Indsætningspunktet tælles i den OPRINDELIGE liste og betyder "foran elementet
// med dette indeks"; liste.length betyder "til sidst". Det er samme talemåde som
// indsaetIndeks returnerer, så kalderen ikke skal omregne mellem de to.
export function flytElement<T>(liste: T[], fra: number, indsaetVed: number): T[] {
  if (fra < 0 || fra >= liste.length) return liste;
  const ud = [...liste];
  const [element] = ud.splice(fra, 1);
  // Fjernelsen rykkede alt efter `fra` et skridt ned, så et indsætningspunkt til
  // højre for elementet selv skal følge med.
  ud.splice(indsaetVed > fra ? indsaetVed - 1 : indsaetVed, 0, element);
  return ud;
}

export type TagRect = { left: number; right: number; top: number; bottom: number };

// Hvilket indsætningspunkt en markørposition peger på i en række tags.
//
// Rækken kan ombrydes over flere linjer, og derfor er et opslag på x alene ikke
// nok: et punkt langt til højre på første linje skal give et andet resultat end
// samme x på anden linje. Så først findes linjen, dernæst pladsen på den.
//
// Rects måles én gang ved trækkets begyndelse. Derfor må denne funktion ikke
// forudsætte, at de svarer til det, der står på skærmen midt i et træk — den
// arbejder udelukkende på de tal, den får.
export function indsaetIndeks(rects: TagRect[], x: number, y: number): number {
  if (rects.length === 0) return 0;

  // Ombrydningen læses af tagsenes egen placering: et tag, der begynder længere
  // til venstre end sin forgænger, er brudt om til en ny linje.
  const linjer: number[][] = [[0]];
  for (let i = 1; i < rects.length; i++) {
    if (rects[i].left <= rects[i - 1].left) linjer.push([i]);
    else linjer[linjer.length - 1].push(i);
  }

  // Nærmeste linje frem for kun den, markøren står præcis på. Føres tagget ud
  // over rækkens kant — eller ned i mellemrummet mellem to linjer — skal det
  // stadig kunne slippes et sted, frem for at trækket lydløst intet gør.
  const linje = linjer.reduce((bedst, l) =>
    afstandTilLinje(rects, l, y) < afstandTilLinje(rects, bedst, y) ? l : bedst
  );

  // På linjen afgør tagsenes midte, om markøren hører til før eller efter hvert
  // tag. Er den til højre for dem alle, peges på pladsen efter linjens sidste.
  const foer = linje.find((i) => x < (rects[i].left + rects[i].right) / 2);
  return foer ?? linje[linje.length - 1] + 1;
}

function afstandTilLinje(rects: TagRect[], linje: number[], y: number): number {
  const top = Math.min(...linje.map((i) => rects[i].top));
  const bund = Math.max(...linje.map((i) => rects[i].bottom));
  if (y < top) return top - y;
  if (y > bund) return y - bund;
  return 0;
}

// Et tidssegment af én tildeling. En tildeling, der kun overlapper en anden i
// en del af sit forløb, får ét segment pr. tidsrum, hvor det aktive antal
// side-om-side tildelinger på banen (cols) er konstant — se layoutEvents.
//
// start/end (arvet fra ScheduleEvent) er fortsat tildelingens EGNE, fulde
// tider. segStart/segEnd er dette ene segments udsnit af dem og bruges kun til
// at udregne segmentets lodrette placering; alt andet (træk, tastatur,
// tooltip, print-klokkeslæt) skal blive ved med at forholde sig til hele
// tildelingen, ikke udsnittet.
export type LaidOutSegment = ScheduleEvent & {
  segStart: number;
  segEnd: number;
  col: number;
  cols: number;
  // Øverste hhv. nederste segment af tildelingen — det er her, kanterne til at
  // ændre varighed skal sidde, og her toppen/bunden af boksen reelt er.
  first: boolean;
  last: boolean;
};

// Fordeler tildelinger på en bane i tidssegmenter, så to tildelinger kun deler
// bredden i det tidsrum, de faktisk overlapper. Uden for overlap fylder hver
// tildeling banens fulde bredde.
//
// Fremgangsmåde: alle tildelingers start- og sluttidspunkter er de eneste
// steder, det aktive antal tildelinger på banen kan ændre sig — mellem to på
// hinanden følgende af disse tidspunkter er mængden af aktive tildelinger
// konstant. Banen deles derfor op i disse tidsrum, og for hvert af dem
// afgøres hvilke tildelinger der er aktive, og hvor mange de skal deles
// imellem.
//
// Kolonnenummeret inden for et tidsrum kommer fra en fast rangordning pr.
// tildeling (samme grådige sweep som tidligere var det endelige layout), så
// rækkefølgen fra venstre mod højre ikke hopper rundt, blot fordi en nabo
// kommer og går — kun selve antallet af kolonner (cols) varierer med tiden.
export function layoutEvents(events: ScheduleEvent[]): LaidOutSegment[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);

  const colRank = new Map<string, number>();
  {
    const kolonner: ScheduleEvent[][] = [];
    for (const ev of sorted) {
      let col = 0;
      while (kolonner[col] && kolonner[col].some((x) => overlaps(x, ev))) col++;
      (kolonner[col] ||= []).push(ev);
      colRank.set(ev.id, col);
    }
  }

  // Tidspunkter, hvor mindst én tildeling starter eller slutter — grænserne
  // mellem tidssegmenterne.
  const graenser = Array.from(new Set(sorted.flatMap((e) => [e.start, e.end]))).sort((a, b) => a - b);

  const segments: LaidOutSegment[] = [];
  for (let i = 0; i < graenser.length - 1; i++) {
    const segStart = graenser[i];
    const segEnd = graenser[i + 1];
    // Et tidsrum kan kun være tomt, hvis to grænser falder sammen — sker ikke,
    // da graenser er et Set, men vagten koster intet.
    if (segStart >= segEnd) continue;

    // Grænserne stammer udelukkende fra tildelingernes egne start/end, så en
    // tildeling enten dækker tidsrummet fuldt ud eller slet ikke — den kan
    // ikke starte eller slutte midt i det.
    const aktive = sorted.filter((e) => e.start <= segStart && e.end >= segEnd);
    if (aktive.length === 0) continue;

    const rangeret = [...aktive].sort((a, b) => (colRank.get(a.id) ?? 0) - (colRank.get(b.id) ?? 0));
    rangeret.forEach((ev, idx) => {
      segments.push({
        ...ev,
        segStart,
        segEnd,
        col: idx,
        cols: rangeret.length,
        first: segStart === ev.start,
        last: segEnd === ev.end,
      });
    });
  }

  // To fortløbende segmenter for samme tildeling kan ende med samme kolonne og
  // samme kolonneantal, hvis en helt anden tildeling på banen både starter og
  // slutter præcis der (fx to andre, der afløser hinanden på slaget). Så ville
  // boksen få en synlig søm midt i et forløb, hvor intet reelt skifter for den
  // selv. Slå dem sammen til ét segment.
  const perTildeling = new Map<string, LaidOutSegment[]>();
  for (const seg of segments) {
    const liste = perTildeling.get(seg.id);
    if (liste) liste.push(seg);
    else perTildeling.set(seg.id, [seg]);
  }

  const out: LaidOutSegment[] = [];
  for (const segs of perTildeling.values()) {
    let current = segs[0];
    for (let i = 1; i < segs.length; i++) {
      const next = segs[i];
      if (current.col === next.col && current.cols === next.cols && current.segEnd === next.segStart) {
        current = { ...current, segEnd: next.segEnd, last: next.last };
      } else {
        out.push(current);
        current = next;
      }
    }
    out.push(current);
  }
  return out;
}

// Lodret placering af ét tidssegment i pixels. Samme 3 px mellemrum foroven og
// forneden som et helt (udelt) event altid har haft — og bevidst ens for ALLE
// segmenter, uanset first/last.
//
// Det er ikke en detalje: to tildelinger, der overlapper i det samme tidsrum,
// får hver deres segment med præcis samme segStart/segEnd, og de skal derfor
// stå nøjagtigt ud for hinanden — samme top, samme højde. Ville randen afhænge
// af den enkelte tildelings egen first/last (som først forsøgt), ville fx den
// tildeling, hvis segment tilfældigvis er dens SIDSTE, kun få bundrand og ikke
// topRand, mens naboens segment (dens FØRSTE) kun fik topRand — to bokse for
// samme tidsrum ville så få forskellig top og højde og ligge skævt for
// hinanden. Den fejl gav netop et lille, fejlplaceret "spjæt" midt i overlappet
// i praksis.
//
// Konsekvensen af ens rand er, at en tildeling, der er delt i flere segmenter
// (fordi den kun overlapper i en del af sit forløb), får et lille, synligt
// mellemrum mellem sine egne segmenter, ligesom mellem to helt separate
// tildelinger — det er en bevidst, enkel afvejning: et par pixels luft midt i
// forløbet er et langt mindre problem end bokse, der ikke passer sammen.
export function segmentGeometri(
  seg: { segStart: number; segEnd: number },
  range: { min: number; max: number },
  ppm: number
): { top: number; height: number } {
  const fra = Math.max(seg.segStart, range.min);
  const til = Math.min(seg.segEnd, range.max);
  return {
    top: (fra - range.min) * ppm + 3,
    height: Math.max((til - fra) * ppm - 6, 24),
  };
}
