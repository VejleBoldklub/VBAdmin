// Datoerne i en gentagen booking.
//
// Ren regnestykke-fil: ingen database, ingen React, ingen new Date() indeni.
// Serien beregnes ud fra en startdato og et mønster, og resultatet er en liste
// af datoer i formen "ÅÅÅÅ-MM-DD". Klokkeslættet hører ikke til her — hver
// forekomst i serien har de samme minutter siden midnat som den første, og
// omregningen til et tidspunkt på tidslinjen sker med danskTidTilInstant() i
// regler.ts.
//
// Det er ikke en detalje. Regnes serien i stedet ved at lægge 7 × 24 timer til
// et tidsstempel, flytter hver booking sig en time, når sommertiden skifter: en
// aftale kl. 16.00 bliver til kl. 15.00 i slutningen af oktober. Datoer plus
// klokkeslæt i dansk tid rammer altid det klokkeslæt, klubben har aftalt.

export const GENTAGELSER = ["ugentlig", "hver-anden-uge", "maanedlig"] as const;

export type Gentagelse = (typeof GENTAGELSER)[number];

export function erGentagelse(vaerdi: unknown): vaerdi is Gentagelse {
  return typeof vaerdi === "string" && GENTAGELSER.some((g) => g === vaerdi);
}

// Serien slutter enten på en dato eller efter et antal forekomster. Admin vælger
// den ene metode — de kan ikke være i brug samtidig, og en union gør det umuligt
// at komme til at sende begge dele.
export type Afslutning =
  | { slags: "slutdato"; dato: string }
  // Det samlede antal bookinger, den første medregnet. "3" giver altså tre
  // datoer, ikke fire. Det er sådan et menneske tæller en aftalerække.
  | { slags: "antal"; antal: number };

// Loft over hvor mange bookinger én oprettelse kan lave. Findes for at et
// tastefejlet tal ikke kan lægge hundredvis af rækker i tabellen på ét klik.
// Grænsen på seks måneder frem gør i praksis loftet uopnåeligt for et ugentligt
// mønster; det er en sikkerhedsline, ikke en forretningsregel.
export const MAKS_FOREKOMSTER = 52;

export const GENTAGELSE_TEKST: Record<Gentagelse, string> = {
  ugentlig: "Hver uge",
  "hver-anden-uge": "Hver anden uge",
  maanedlig: "Hver måned",
};

const DATO_FORM = /^\d{4}-\d{2}-\d{2}$/;

type Datodele = { aar: number; maaned: number; dag: number };

// Dag 0 i den følgende måned er den sidste dag i denne. UTC hele vejen: datoen er
// en kalenderdato, ikke et tidspunkt, og en lokal tidszone ville kunne skubbe den
// et døgn.
function dageIMaaned(aar: number, maaned: number): number {
  return new Date(Date.UTC(aar, maaned, 0)).getUTCDate();
}

// Datoen skal både have den rigtige form og findes i kalenderen. "2026-02-30"
// består det første, men ikke det andet, og en serie bygget på den ville lande et
// helt andet sted end den, der blev tastet.
function delDato(dato: string): Datodele | null {
  if (!DATO_FORM.test(dato)) return null;

  const aar = Number(dato.slice(0, 4));
  const maaned = Number(dato.slice(5, 7));
  const dag = Number(dato.slice(8, 10));

  if (maaned < 1 || maaned > 12) return null;
  if (dag < 1 || dag > dageIMaaned(aar, maaned)) return null;

  return { aar, maaned, dag };
}

function samlDato({ aar, maaned, dag }: Datodele): string {
  return `${String(aar).padStart(4, "0")}-${String(maaned).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

function dageEfter(dele: Datodele, dage: number): Datodele {
  const d = new Date(Date.UTC(dele.aar, dele.maaned - 1, dele.dag));
  d.setUTCDate(d.getUTCDate() + dage);
  return { aar: d.getUTCFullYear(), maaned: d.getUTCMonth() + 1, dag: d.getUTCDate() };
}

// Samme dag i måneden, n måneder frem — eller null, hvis den dag ikke findes i
// den måned.
//
// Bevidst valg: den 31. januar bliver IKKE til den 28. februar. Klemte vi datoen
// ind i en kortere måned, ville en aftale flytte sig, uden at nogen havde bedt om
// det, og næste forekomst ville stå den 31. marts — altså en rækkefølge, der
// hopper frem og tilbage. En måned uden dagen springes over, og serien fortsætter
// på den rigtige dag måneden efter. Det er den eneste opførsel, der kan forklares
// på én linje til den, der har booket.
function maanederEfter(dele: Datodele, maaneder: number): Datodele | null {
  const samlet = dele.maaned - 1 + maaneder;
  const aar = dele.aar + Math.floor(samlet / 12);
  const maaned = (((samlet % 12) + 12) % 12) + 1;

  if (dele.dag > dageIMaaned(aar, maaned)) return null;

  return { aar, maaned, dag: dele.dag };
}

export type SerieResultat = { ok: true; datoer: string[] } | { ok: false; fejl: string };

// Hvor mange skridt der prøves, før det gives op. Kun månedsmønstret kan springe
// et skridt over, og kun for dag 29-31, så loftet er rundhåndet — det er en
// spærre mod en uendelig løkke, ikke en grænse nogen kan komme til at ramme.
const MAKS_SKRIDT = MAKS_FOREKOMSTER * 4 + 24;

function skridt(start: Datodele, gentagelse: Gentagelse, nummer: number): Datodele | null {
  switch (gentagelse) {
    case "ugentlig":
      return dageEfter(start, 7 * nummer);
    case "hver-anden-uge":
      return dageEfter(start, 14 * nummer);
    case "maanedlig":
      return maanederEfter(start, nummer);
  }
}

// Datoerne i serien, den første medregnet, i stigende rækkefølge.
//
// Funktionen bedømmer ikke åbningstider, fortid eller om tiden er ledig. Den
// laver kun listen; alt det andet afgøres pr. dato af tjekTidsrum() og af
// konflikttjekket mod databasen, netop fordi de svar afhænger af hvad klokken er,
// og hvad der allerede står i tabellen.
export function serieDatoer(
  startDato: string,
  gentagelse: Gentagelse,
  afslutning: Afslutning
): SerieResultat {
  const start = delDato(startDato);
  if (!start) return { ok: false, fejl: "Startdatoen er ikke en gyldig dato." };

  const datoer: string[] = [samlDato(start)];

  if (afslutning.slags === "antal") {
    if (!Number.isInteger(afslutning.antal) || afslutning.antal < 2) {
      return { ok: false, fejl: "En serie skal bestå af mindst 2 bookinger." };
    }
    if (afslutning.antal > MAKS_FOREKOMSTER) {
      return { ok: false, fejl: `En serie kan højst bestå af ${MAKS_FOREKOMSTER} bookinger.` };
    }

    for (let n = 1; datoer.length < afslutning.antal && n <= MAKS_SKRIDT; n++) {
      const naeste = skridt(start, gentagelse, n);
      if (naeste) datoer.push(samlDato(naeste));
    }

    if (datoer.length < afslutning.antal) {
      // Kan kun ske for månedsmønstret med en dag, der springes over igen og
      // igen. Med loftet ovenfor er det praktisk talt uopnåeligt, men et tavst
      // for kort svar ville være værre end en besked.
      return { ok: false, fejl: "Serien kunne ikke beregnes. Vælg en anden startdato." };
    }

    return { ok: true, datoer };
  }

  const slut = delDato(afslutning.dato);
  if (!slut) return { ok: false, fejl: "Slutdatoen er ikke en gyldig dato." };

  const slutTekst = samlDato(slut);
  if (slutTekst < datoer[0]) {
    return { ok: false, fejl: "Slutdatoen skal ligge på eller efter den første booking." };
  }

  // Datoerne er nulpolstrede, så en almindelig strengsammenligning er den samme
  // som en kalendersammenligning. Det er blandt andet derfor formen "ÅÅÅÅ-MM-DD"
  // bruges hele vejen igennem modulet.
  for (let n = 1; n <= MAKS_SKRIDT; n++) {
    const naeste = skridt(start, gentagelse, n);
    if (!naeste) continue;

    const tekst = samlDato(naeste);
    if (tekst > slutTekst) break;

    datoer.push(tekst);

    if (datoer.length > MAKS_FOREKOMSTER) {
      return {
        ok: false,
        fejl: `Serien ville give mere end ${MAKS_FOREKOMSTER} bookinger. Vælg en tidligere slutdato.`,
      };
    }
  }

  return { ok: true, datoer };
}

// "Hver uge · 12 bookinger". Bruges i kvitteringen, i mailen og i adminlisten, så
// den samme serie beskrives med de samme ord alle steder.
export function serieTekst(gentagelse: Gentagelse, antal: number): string {
  return `${GENTAGELSE_TEKST[gentagelse]} · ${antal} ${antal === 1 ? "booking" : "bookinger"}`;
}

// En kalenderdato skrevet ud på dansk: "on. 5. aug. 2026".
//
// Regnes af hånden frem for med Intl, og det er ikke for at spare noget. Serien
// vises som en forhåndsvisning i adminfladens formular, og den samme liste
// tegnes både på serveren og i browseren. Intl.DateTimeFormat kan give minimalt
// forskellige strenge i to forskellige ICU-udgaver — det ville være nok til en
// hydreringsadvarsel og til, at React kasserer det, serveren sendte. Her er
// resultatet det samme overalt.
//
// Formen holdes med vilje tæt på tidsrumDelt() i regler.ts, som skriver de samme
// datoer ud i bookinglisten.
const UGEDAGE_KORT = ["ma.", "ti.", "on.", "to.", "fr.", "lø.", "sø."];

const MAANEDER_KORT = [
  "jan.",
  "feb.",
  "mar.",
  "apr.",
  "maj",
  "jun.",
  "jul.",
  "aug.",
  "sep.",
  "okt.",
  "nov.",
  "dec.",
];

export function datoTekst(dato: string): string {
  const dele = delDato(dato);
  if (!dele) return dato;

  // getUTCDay: 0 = søndag. Listen begynder med mandag, så søndag flyttes bagerst.
  const ugedag = new Date(Date.UTC(dele.aar, dele.maaned - 1, dele.dag)).getUTCDay();
  const indeks = ugedag === 0 ? 6 : ugedag - 1;

  return `${UGEDAGE_KORT[indeks]} ${dele.dag}. ${MAANEDER_KORT[dele.maaned - 1]} ${dele.aar}`;
}
