// Bookingreglerne i TypeScript.
//
// Reglerne håndhæves i databasen af rækkesikkerhedspolicyen i
// supabase/lokalebooking-skema.sql, som er den egentlige spærre — den offentlige
// rute bruger anon-nøglen og kan kaldes direkte mod API'et af enhver.
//
// Denne fil findes for at kunne vise brugeren en forståelig fejl FØR
// forespørgslen sendes, og for at kunne tegne kalenderen. Den er altså en
// bekvemmelighed, ikke en sikkerhedsgrænse, og de to skal holdes i takt: enhver
// ændring her skal spejles i SQL-filen og omvendt.

export const TIDSZONE = "Europe/Copenhagen";

export const AABNER_HVERDAG = 14 * 60; // 14.00
export const AABNER_WEEKEND = 9 * 60; //  09.00
export const LUKKER = 22 * 60; //        22.00

export const SNAP = 15;
export const MIN_VARIGHED = 15;
export const MAKS_VARIGHED = 8 * 60;
export const MAKS_MAANEDER_FREM = 6;

// Bookinger angives altid i dansk tid, uanset hvor brugeren sidder. Derfor
// omregnes hvert tidspunkt til ugedag og klokketid i Europe/Copenhagen frem for
// at bruge browserens eller serverens egen tidszone.
//
// hourCycle "h23" er nødvendig: uden den kan midnat i nogle miljøer formateres
// som time 24, hvilket ville give 1440 minutter og skæve sammenligninger.
const FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIDSZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const UGEDAGE: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export type DanskTid = {
  // 1 = mandag ... 7 = søndag, som Postgres' isodow.
  isoDag: number;
  // Minutter siden midnat i dansk tid.
  minutter: number;
  // Datoen i dansk tid, "ÅÅÅÅ-MM-DD".
  dato: string;
};

export function danskTid(tidspunkt: Date): DanskTid {
  const dele: Record<string, string> = {};
  for (const del of FORMATTER.formatToParts(tidspunkt)) {
    if (del.type !== "literal") dele[del.type] = del.value;
  }
  return {
    isoDag: UGEDAGE[dele.weekday] ?? 0,
    minutter: Number(dele.hour) * 60 + Number(dele.minute),
    dato: `${dele.year}-${dele.month}-${dele.day}`,
  };
}

export function aabnerKl(isoDag: number): number {
  return isoDag <= 5 ? AABNER_HVERDAG : AABNER_WEEKEND;
}

export function erWeekend(isoDag: number): boolean {
  return isoDag >= 6;
}

export type Regelbrud =
  | "slut-foer-start"
  | "ikke-kvarter"
  | "for-kort"
  | "for-lang"
  | "i-fortiden"
  | "for-langt-frem"
  | "foer-aabningstid"
  | "efter-lukketid";

export const REGELBRUD_TEKST: Record<Regelbrud, string> = {
  "slut-foer-start": "Sluttidspunktet skal ligge efter starttidspunktet.",
  "ikke-kvarter": "Bookinger skal starte og slutte på et kvarter.",
  "for-kort": "En booking skal vare mindst 15 minutter.",
  "for-lang": "En booking kan højst vare 8 timer.",
  "i-fortiden": "Tidspunktet er passeret.",
  "for-langt-frem": "Der kan bookes højst 6 måneder frem.",
  "foer-aabningstid": "Lokalet åbner kl. 14.00 på hverdage og kl. 09.00 i weekenden.",
  "efter-lukketid": "Bookingen skal være slut senest kl. 22.00 samme dag.",
};

// Tjekker et tidsrum mod alle regler og returnerer hvert brud, så brugeren kan
// få dem alle at vide på én gang frem for ét ad gangen.
//
// `nu` er en parameter frem for et kald til new Date() indeni, så funktionen er
// deterministisk og kan efterprøves.
export function tjekTidsrum(start: Date, slut: Date, nu: Date): Regelbrud[] {
  const brud: Regelbrud[] = [];

  const varighed = (slut.getTime() - start.getTime()) / 60000;

  if (varighed <= 0) {
    // Alt andet er meningsløst at bedømme, når rækkefølgen er forkert.
    return ["slut-foer-start"];
  }

  if (start.getTime() % (SNAP * 60000) !== 0 || slut.getTime() % (SNAP * 60000) !== 0) {
    brud.push("ikke-kvarter");
  }
  if (varighed < MIN_VARIGHED) brud.push("for-kort");
  if (varighed > MAKS_VARIGHED) brud.push("for-lang");

  if (start.getTime() < nu.getTime()) brud.push("i-fortiden");

  const graense = new Date(nu.getTime());
  graense.setUTCMonth(graense.getUTCMonth() + MAKS_MAANEDER_FREM);
  if (start.getTime() > graense.getTime()) brud.push("for-langt-frem");

  const s = danskTid(start);
  if (s.minutter < aabnerKl(s.isoDag)) brud.push("foer-aabningstid");

  // Slutningen bedømmes ud fra startdagen, ikke ud fra sluttidspunktets egen
  // klokketid. En booking 23.00-00.00 har sluttid 00:00, som ville se ud som om
  // den lå før kl. 22 — samme fælde som i SQL-policyen.
  if (s.minutter + varighed > LUKKER) brud.push("efter-lukketid");

  return brud;
}

// Kvarterer der kan vælges på en given dag, som minutter siden midnat.
// Sidste startmulighed er et kvarter før lukketid.
export function kvartererPaaDag(isoDag: number): number[] {
  const ud: number[] = [];
  for (let m = aabnerKl(isoDag); m <= LUKKER - SNAP; m += SNAP) ud.push(m);
  return ud;
}

export function minutterTilKlokke(minutter: number): string {
  const t = Math.floor(minutter / 60);
  const m = minutter % 60;
  return `${String(t).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

// Et tidsrum skrevet ud i dansk tid, til kvitteringer og mails: "onsdag 5. august
// 2026 kl. 16.00–17.00".
//
// Formateres altid i dansk tid, uanset hvor læseren sidder. En bekræftelse, der
// viser et andet klokkeslæt end det bookede, er værre end ingen bekræftelse.
const TIDSRUM_DAG = new Intl.DateTimeFormat("da-DK", {
  timeZone: TIDSZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function tidsrumTekst(start: Date, slut: Date): string {
  const s = danskTid(start);
  const sl = danskTid(slut);
  return `${TIDSRUM_DAG.format(start)} kl. ${minutterTilKlokke(s.minutter)}–${minutterTilKlokke(sl.minutter)}`;
}

// Den modsatte vej af danskTid: en dato og en klokketid, som brugeren har valgt i
// dansk tid, oversat til det tidspunkt på tidslinjen der skal i databasen.
//
// Nødvendig, fordi hverken serveren eller browseren kan antages at stå i dansk
// tid. Vercel kører i UTC, og en bruger på ferie i Spanien skal stadig kunne
// booke kl. 16.00 dansk tid. `new Date("2026-08-05T16:00")` ville bruge
// afviklingsmiljøets egen tidszone og altså give et forkert tidspunkt.
//
// Fremgangsmåden: gæt først på tidspunktet som om dansk tid var UTC, se hvad det
// gæt faktisk svarer til i dansk tid, og ret gættet med forskellen. Anden runde
// fanger de tilfælde, hvor rettelsen selv flytter gættet over et sommertidsskift.
//
// Tidspunkter, der ikke findes eller findes to gange, opstår kun ved skiftet kl.
// 02.00–03.00, som ligger uden for åbningstiden. Funktionen returnerer i de
// tilfælde et brugbart tidspunkt frem for at fejle, og tjekTidsrum afviser det
// alligevel, hvis det ligger uden for åbningstiden.
export function danskTidTilInstant(dato: string, minutter: number): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato)) {
    throw new Error(`Ugyldig dato: ${dato}`);
  }

  const oensket = Date.parse(`${dato}T00:00:00Z`) + minutter * 60000;
  if (Number.isNaN(oensket)) {
    throw new Error(`Ugyldig dato: ${dato}`);
  }

  let instant = oensket;
  for (let runde = 0; runde < 2; runde++) {
    const d = danskTid(new Date(instant));
    const faktisk = Date.parse(`${d.dato}T00:00:00Z`) + d.minutter * 60000;
    if (faktisk === oensket) break;
    instant += oensket - faktisk;
  }

  return new Date(instant);
}

// Læser et kvarter fra et formularfelt. Værdierne i formularen er minutter siden
// midnat, ikke klokketider, så der ikke skal parses tekst på vej ind.
//
// Grænserne er dagens yderpunkter, ikke den enkelte dags åbningstid: hvilken dag
// tidspunktet hører til, ved denne funktion ikke noget om. Det er tjekTidsrum,
// der bedømmer åbningstid.
export function minutterFraTekst(vaerdi: unknown): number | null {
  if (typeof vaerdi !== "string" || vaerdi.trim() === "") return null;

  const n = Number(vaerdi);
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n > 24 * 60) return null;
  if (n % SNAP !== 0) return null;

  return n;
}
