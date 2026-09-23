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
// side-om-side tildelinger på banen er konstant — se layoutEvents.
//
// start/end (arvet fra ScheduleEvent) er fortsat tildelingens EGNE, fulde
// tider. segStart/segEnd er dette ene segments udsnit af dem og bruges kun til
// at udregne segmentets lodrette placering; alt andet (træk, tastatur,
// tooltip, print-klokkeslæt) skal blive ved med at forholde sig til hele
// tildelingen, ikke udsnittet.
export type LaidOutSegment = ScheduleEvent & {
  segStart: number;
  segEnd: number;
  // Segmentet dækker kolonnerne col .. col + span - 1 af banens cols
  // kolonner. Hver tildeling har én fast kolonne, men breder sig ud i ledige
  // kolonner ved siden af — se layoutEvents.
  col: number;
  span: number;
  cols: number;
  // Øverste hhv. nederste segment af DENNE tildeling — det er her, kanterne
  // til at ændre varighed, tekstfelterne og tastaturfokus skal sidde. Uafhængigt
  // af topRand/bundRand herunder: en tildeling kan sagtens have sit eget første
  // segment, uden at der skal vises nogen luft/runding der (se dem).
  first: boolean;
  last: boolean;
  // Skal segmentet vises med luft og runding foroven hhv. forneden? Det
  // afgøres IKKE af denne ene tildelings first/last, men af om HELE banens
  // aktive mængde reelt skifter fuldstændigt ved den grænse — se layoutEvents.
  topRand: boolean;
  bundRand: boolean;
  // Skal DENNE tildelings holdnavn (og evt. omklædning/tid) vises i dette
  // segment i den læsende visning? Kun ét af tildelingens egne segmenter får
  // dette sat — se layoutEvents for hvilket. Uden det ville et holdnavn blive
  // gentaget i hvert segment, også i en kort bid, der kun findes, fordi
  // tildelingen en overgang deler bredde med en anden.
  visLabel: boolean;
  // Placeringen af DENNE tildelings segment umiddelbart ovenover hhv.
  // nedenunder, eller null ved tildelingens egen start/slutning. Bruges af
  // segmentKant til at tegne kanten hele vejen rundt om tildelingen — også
  // ved et sving, hvor dens bredde skifter midt i forløbet.
  over: SegmentPlads | null;
  under: SegmentPlads | null;
};

export type SegmentPlads = { col: number; span: number; cols: number };

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
// Hver tildeling har en fast kolonne (samme grådige sweep som tidligere var
// det endelige layout), og antallet af kolonner er fast for hele klyngen af
// tildelinger, der overlapper hinanden. I hvert tidsrum breder en tildeling
// sig ud i de ledige kolonner ved siden af sin egen — alene på banen fylder
// den derfor hele bredden. Da den altid beholder sin egen kolonne, skifter den
// aldrig side undervejs; den bliver kun bredere eller smallere.
//
// Luft/runding (topRand/bundRand) er en egenskab ved GRÆNSEN, ikke ved den
// enkelte tildeling: en grænse viser kun luft, hvis INGEN tildeling fortsætter
// hen over den (mængden af aktive tildelinger skifter fuldstændigt). Fortsætter
// blot én tildeling — fx fordi den er midt i sit eget forløb, mens en anden
// samtidig starter eller slutter ved siden af den — skal grænsen være uden luft
// for ALLE tildelinger, der er aktive på begge sider af den. Ellers ville to
// tildelinger, der er aktive i nøjagtig det samme tidsrum (fx under et
// overlap), kunne få forskellig rand og dermed forskellig lodret placering for
// samme tidsrum — det var netop det, der gav et fejlplaceret "spjæt" midt i et
// overlap i en tidligere udgave af denne funktion.
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

  // Antallet af kolonner er fast for en hel klynge af tildelinger, der hænger
  // sammen gennem overlap — det største antal, der på noget tidspunkt står side
  // om side i klyngen. Det er det, der holder hver tildeling i sin egen kolonne
  // hele vejen: talte man kolonner pr. tidsrum, ville en tildeling hoppe fra
  // højre halvdel til midterste tredjedel og videre til venstre halvdel, blot
  // fordi naboerne kommer og går — og så kan dens kant ikke følge den.
  const klyngeCols = new Map<string, number>();
  {
    let klynge: ScheduleEvent[] = [];
    let klyngeSlut = -Infinity;
    const afslut = () => {
      const n = Math.max(...klynge.map((e) => (colRank.get(e.id) ?? 0) + 1));
      for (const e of klynge) klyngeCols.set(e.id, n);
    };
    for (const ev of sorted) {
      if (klynge.length > 0 && ev.start >= klyngeSlut) {
        afslut();
        klynge = [];
      }
      klynge.push(ev);
      klyngeSlut = Math.max(klyngeSlut, ev.end);
    }
    afslut();
  }

  // Tidspunkter, hvor mindst én tildeling starter eller slutter — grænserne
  // mellem tidsrummene.
  const graenser = Array.from(new Set(sorted.flatMap((e) => [e.start, e.end]))).sort((a, b) => a - b);

  // Aktive tildelinger pr. tidsrum. Grænserne stammer udelukkende fra
  // tildelingernes egne start/end, så en tildeling enten dækker et tidsrum
  // fuldt ud eller slet ikke — den kan ikke starte eller slutte midt i det.
  const rum: { start: number; end: number; aktive: ScheduleEvent[] }[] = [];
  for (let i = 0; i < graenser.length - 1; i++) {
    const start = graenser[i];
    const end = graenser[i + 1];
    if (start >= end) continue; // Kan kun ske ved dubletter i graenser — sker ikke, da det er et Set.
    rum.push({ start, end, aktive: sorted.filter((e) => e.start <= start && e.end >= end) });
  }

  // Fortsætter mindst én tildeling fra ét tidsrum til et andet (er med i begge
  // rums aktive liste)? Det er det eneste, der afgør, om grænsen mellem dem
  // skal vises som et reelt skel (luft + runding) eller ej.
  function nogenFortsaetter(a: ScheduleEvent[], b: ScheduleEvent[]): boolean {
    if (a.length === 0 || b.length === 0) return false;
    const ids = new Set(a.map((e) => e.id));
    return b.some((e) => ids.has(e.id));
  }

  const segments: LaidOutSegment[] = [];
  rum.forEach((r, i) => {
    if (r.aktive.length === 0) return;
    const forrige = i > 0 ? rum[i - 1] : null;
    const naeste = i < rum.length - 1 ? rum[i + 1] : null;
    const topRand = !forrige || !nogenFortsaetter(forrige.aktive, r.aktive);
    const bundRand = !naeste || !nogenFortsaetter(r.aktive, naeste.aktive);

    const rangeret = [...r.aktive].sort((a, b) => (colRank.get(a.id) ?? 0) - (colRank.get(b.id) ?? 0));
    const cols = klyngeCols.get(rangeret[0].id) ?? rangeret.length;
    rangeret.forEach((ev, idx) => {
      // Tildelingen står i sin egen faste kolonne og breder sig ud i de
      // ledige kolonner ved siden af. Ligger der ledige kolonner mellem to
      // tildelinger, deles de, med den ulige kolonne til den venstre.
      const rank = colRank.get(ev.id) ?? 0;
      const venstreNabo = idx > 0 ? colRank.get(rangeret[idx - 1].id) ?? 0 : null;
      const hoejreNabo = idx < rangeret.length - 1 ? colRank.get(rangeret[idx + 1].id) ?? 0 : null;
      const fra = venstreNabo === null ? 0 : rank - Math.floor((rank - venstreNabo - 1) / 2);
      const til = hoejreNabo === null ? cols : rank + 1 + Math.ceil((hoejreNabo - rank - 1) / 2);
      segments.push({
        ...ev,
        segStart: r.start,
        segEnd: r.end,
        col: fra,
        span: til - fra,
        cols,
        first: r.start === ev.start,
        last: r.end === ev.end,
        topRand,
        bundRand,
        // Sættes rigtigt nedenfor, når tildelingens segmenter er lagt sammen —
        // her er det stadig ukendt, hvilket af dem der bliver det største.
        visLabel: false,
        over: null,
        under: null,
      });
    });
  });

  // To fortløbende segmenter for samme tildeling har pr. definition altid
  // topRand/bundRand = false ved den fælles grænse (tildelingen selv er jo det,
  // der fortsætter). De kan derfor altid slås sammen uden at ændre udseende —
  // det sparer blot en ekstra DOM-boks og en overflødig, usynlig kant midt i
  // forløbet, hvis kolonnen også er uændret.
  const perTildeling = new Map<string, LaidOutSegment[]>();
  for (const seg of segments) {
    const liste = perTildeling.get(seg.id);
    if (liste) liste.push(seg);
    else perTildeling.set(seg.id, [seg]);
  }

  const out: LaidOutSegment[] = [];
  for (const segs of perTildeling.values()) {
    const samlet: LaidOutSegment[] = [];
    let current = segs[0];
    for (let i = 1; i < segs.length; i++) {
      const next = segs[i];
      if (current.col === next.col && current.span === next.span && current.cols === next.cols && current.segEnd === next.segStart) {
        current = { ...current, segEnd: next.segEnd, last: next.last, bundRand: next.bundRand };
      } else {
        samlet.push(current);
        current = next;
      }
    }
    samlet.push(current);
    // Naboerne kendes først nu, hvor segmenterne er lagt sammen. En tildeling
    // er sammenhængende i tid, så de sammenlagte segmenter støder altid op til
    // hinanden i rækkefølge.
    samlet.forEach((seg, i) => {
      const over = samlet[i - 1];
      const under = samlet[i + 1];
      out.push({
        ...seg,
        over: over ? { col: over.col, span: over.span, cols: over.cols } : null,
        under: under ? { col: under.col, span: under.span, cols: under.cols } : null,
      });
    });
  }

  // Hvilket af hver tildelings (nu sammenlagte) segmenter skal vise
  // holdnavnet? Foretræk det LÆNGSTE af tildelingens egne segmenter — det er
  // det, der giver mest lodret plads til teksten (holdnavn + evt.
  // omklædningsrum på egen linje). Fuld bredde (span === cols) bruges kun som
  // tiebreaker, når to segmenter har nøjagtig samme varighed.
  //
  // Tidligere blev fuld bredde foretrukket FØR varighed. Det gik galt, når en
  // tildeling kun var alene på banen ganske kort — fx et par minutter, før en
  // anden tildeling overlappede resten af dens forløb: det korte, fulde-
  // bredde-segment blev valgt frem for det lange, delte segment, og teksten
  // endte i den lille boks, klemt eller skåret af i toppen, i stedet for i den
  // store. Bredden afgør kun, hvor meget teksten skal ombrydes ELLER
  // afkortes vandret — det klarer overflow-hidden på selve boksen — mens en
  // for lille HØJDE får teksten til at gå ud over boksens egen kant. Det er
  // højden (varigheden), der er den knappe ressource, ikke bredden.
  const perTildelingUd = new Map<string, LaidOutSegment[]>();
  for (const seg of out) {
    const liste = perTildelingUd.get(seg.id);
    if (liste) liste.push(seg);
    else perTildelingUd.set(seg.id, [seg]);
  }
  const labelSegmenter = new Set<LaidOutSegment>();
  for (const segs of perTildelingUd.values()) {
    let bedst = segs[0];
    for (const s of segs.slice(1)) {
      const bedstVarighed = bedst.segEnd - bedst.segStart;
      const sVarighed = s.segEnd - s.segStart;
      const bedstFuldBredde = bedst.span === bedst.cols;
      const sFuldBredde = s.span === s.cols;
      if (
        sVarighed > bedstVarighed ||
        (sVarighed === bedstVarighed && sFuldBredde && !bedstFuldBredde)
      ) {
        bedst = s;
      }
    }
    labelSegmenter.add(bedst);
  }

  return out.map((seg) => ({ ...seg, visLabel: labelSegmenter.has(seg) }));
}

// Lodret placering af ét tidssegment i pixels. De 3 px's mellemrum til
// naboerne ovenfor/nedenfor hører til, hvor ENTEN segmentets topRand/bundRand
// (se layoutEvents) er sat — altså hvor HELE banens aktive mængde af
// tildelinger reelt skifter fuldstændigt ved den grænse — ELLER hvor dette er
// tildelingens EGEN reelle start/slutning (first/last), selvom en anden,
// samtidig tildeling fortsætter uændret hen over grænsen.
//
// De to kan give forskelligt resultat for to tildelinger i nøjagtig samme
// tidsrum: fortsætter A uændret, mens B reelt starter der (B skifter fra ikke
// at være aktiv til at være det, midt i A's forløb), får B luft foroven, men
// ikke A. Det er hverken en fejl eller det samme som det oprindelige
// "spjæt" — dengang fik CONCURRENTE segmenter, der reelt dækkede nøjagtig
// samme tidsrum og skulle stå pixel-nøjagtigt ud for hinanden, forskellig
// rand og dermed forskellig placering for samme tidsrum. Her er formålet
// tværtimod at vise et ægte skel: A fortsætter synligt uden brud, mens B får
// sin egen afgrænsede boks med luft til det, den støder op til — det er selve
// "svinget", hvor en tildelings bredde skifter midt i en andens forløb.
// (topRand/bundRand er derfor stadig den eneste kilde til AFRUNDING, som SKAL
// være ens på tværs af concurrent segmenter — se afrunding i DagGitter/
// EventBox.)
//
// Gulvet for højden er det samme, som et udelt segment (fuld rand foroven og
// forneden) altid har haft (24 px). Det vokser dog KUN med topRand/bundRand,
// ikke med first/last — luften ved et sving flytter altså kun segmentets
// POSITION, ikke gulvets størrelse. Ellers ville et meget kort (15 min)
// segment, der både er en tildelings egen start (first, midt i en andens
// forløb) og lige efter skal fortsætte i et nyt segment, kunne få et gulv,
// der skubber dets bund langt forbi det næste segments top — de to hænger jo
// stadig sammen som én tildeling.
//
// Med kun 15 minutters mindstevarighed og printvisningens lavere px/minut
// (20/15 mod skærmens 26/15) er der ét kendt, accepteret grænsetilfælde
// tilbage: rammer et sving-segment på PRÆCIS 15 minutter gulvet i
// printvisningen, kan dets bund række 1 px forbi det næste segments top for
// samme tildeling. Det er ubemærkeligt (samme farve, samme tildeling, 1 px)
// og langt bedre end før denne omskrivning, hvor det samme kunne ske med op
// til 8-9 px — at lukke den sidste pixel helt kræver at kende NÆSTE segments
// egen rand, hvilket ikke er det værd for en forskel, ingen kan se.

//
// Derudover rækker et segment KANT_PX ind i sin nabo ovenover/nedenunder, når
// segmentKant siger udvidTop/udvidBund — se dér.
export function segmentGeometri(
  seg: {
    segStart: number;
    segEnd: number;
    topRand: boolean;
    bundRand: boolean;
    first: boolean;
    last: boolean;
    col: number;
    span: number;
    cols: number;
    over: SegmentPlads | null;
    under: SegmentPlads | null;
  },
  range: { min: number; max: number },
  ppm: number
): { top: number; height: number } {
  const fra = Math.max(seg.segStart, range.min);
  const til = Math.min(seg.segEnd, range.max);
  const top = seg.topRand || seg.first ? 3 : 0;
  const bund = seg.bundRand || seg.last ? 3 : 0;
  const gulvTop = seg.topRand ? 3 : 0;
  const gulvBund = seg.bundRand ? 3 : 0;
  const kant = segmentKant(seg);
  const udvidTop = kant.udvidTop ? KANT_PX : 0;
  const udvidBund = kant.udvidBund ? KANT_PX : 0;
  return {
    top: (fra - range.min) * ppm + top - udvidTop,
    height: Math.max((til - fra) * ppm - top - bund, 18 + gulvTop + gulvBund) + udvidTop + udvidBund,
  };
}

// Kantens tykkelse på en tildeling (Tailwinds border-2).
export const KANT_PX = 2;

export type SegmentKant = {
  kantTop: boolean;
  kantBund: boolean;
  rundTopVenstre: boolean;
  rundTopHoejre: boolean;
  rundBundVenstre: boolean;
  rundBundHoejre: boolean;
  // Rækker segmentet KANT_PX op i hhv. ned i sin nabo? Se segmentKant.
  udvidTop: boolean;
  udvidBund: boolean;
};

// Hvilke vandrette kanter og hjørner et segment skal have, så tildelingen står
// med én sammenhængende kant HELE vejen rundt — også ved et sving, hvor dens
// bredde skifter midt i forløbet, fordi en anden tildeling kommer eller går ved
// siden af den.
//
// Ved tildelingens egen start/slutning (ingen nabo) er det enkelt: fuld kant og
// runde hjørner. Ved et sving mødes to af tildelingens egne segmenter, og de
// vandrette kanter skal da kun tegnes på det stykke, hvor det ene segment
// rager ud over det andet — det er dér, tildelingen reelt slutter, og hvor den
// støder op til den anden tildeling. På det stykke, de har fælles, skal der
// ingen streg være, ellers deles tildelingen visuelt i flere bokse.
//
// CSS kan ikke tegne en kant på kun en del af en side. I stedet får det BREDE
// segment fuld kant på den side, og det SMALLE segment rækker KANT_PX ind over
// den (udvidTop/udvidBund) og ligger øverst (se segmentZ i event-styles). Dets baggrund dækker
// så kanten på det fælles stykke, og dets egne lodrette kanter løber
// ubrudt videre op/ned og møder det brede segments kant i hjørnet. Tilbage
// står kanten kun på det stykke, hvor det brede segment rager ud.
//
// Runde hjørner sættes kun, hvor segmentet rager ud over naboen — det er et
// udvendigt hjørne. Hvor de to flugter, skal kanten fortsætte lige.
//
// Rager de to hver til sin side (kun muligt med tre eller flere samtidige
// tildelinger på banen), er ingen af dem den smalle. Så får begge kant, og der
// står en streg på det fælles stykke. Det er et sjældent tilfælde, hvor det er
// acceptabelt, at svinget ikke er helt rent.
export function segmentKant(seg: {
  col: number;
  span: number;
  cols: number;
  over: SegmentPlads | null;
  under: SegmentPlads | null;
}): SegmentKant {
  const top = sidenMod(seg, seg.over);
  const bund = sidenMod(seg, seg.under);
  return {
    kantTop: top.kant,
    kantBund: bund.kant,
    rundTopVenstre: top.rundVenstre,
    rundTopHoejre: top.rundHoejre,
    rundBundVenstre: bund.rundVenstre,
    rundBundHoejre: bund.rundHoejre,
    udvidTop: top.udvid,
    udvidBund: bund.udvid,
  };
}

function sidenMod(seg: SegmentPlads, nabo: SegmentPlads | null) {
  if (!nabo) return { kant: true, rundVenstre: true, rundHoejre: true, udvid: false };
  // Kolonnernes kanter sammenlignes som brøker (col/cols) ved krydsmultiplikation,
  // så afrunding i kommatal ikke kan få to flugtende kanter til at se skæve ud.
  const ragerVenstre = seg.col * nabo.cols < nabo.col * seg.cols;
  const ragerHoejre = (seg.col + seg.span) * nabo.cols > (nabo.col + nabo.span) * seg.cols;
  if (!ragerVenstre && !ragerHoejre) return { kant: false, rundVenstre: false, rundHoejre: false, udvid: true };
  return { kant: true, rundVenstre: ragerVenstre, rundHoejre: ragerHoejre, udvid: false };
}
