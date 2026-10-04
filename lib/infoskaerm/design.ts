import type { DagIndhold } from "./content";

// Frit design af infoskærmen, ét pr. farve.
//
// Et design er en baggrundsfarve og en liste af elementer — tekst, billeder og
// felter — med en position og en størrelse på et lærred på 1920 × 1080. Tallene
// er altid i lærredets egne pixels, uanset hvor stor skærmen eller
// editorvinduet er; det er visningen, der skalerer lærredet op eller ned. Så
// ser designet ens ud i editoren og på kiosken.
//
// Listens rækkefølge er lagenes rækkefølge: det sidste element ligger øverst.
//
// Filen har ingen importer ud over typer og kan derfor bruges både i editoren,
// på skærmen og i serverhandlingen, der gemmer.

export const LAERRED_B = 1920;
export const LAERRED_H = 1080;

// Skrifttyperne indlæses i lib/infoskaerm/skrifttyper.ts. Nøglerne her er det,
// der gemmes i databasen, så et skift af skrifttypens indlæsning ikke kræver,
// at gemte designs skrives om.
export const SKRIFTER = [
  { noegle: "roboto", navn: "Roboto" },
  { noegle: "montserrat", navn: "Montserrat" },
  { noegle: "poppins", navn: "Poppins" },
  { noegle: "oswald", navn: "Oswald" },
  { noegle: "bebas", navn: "Bebas Neue" },
  { noegle: "playfair", navn: "Playfair Display" },
  { noegle: "lobster", navn: "Lobster" },
  { noegle: "marker", navn: "Permanent Marker" },
] as const;

export type SkriftNoegle = (typeof SKRIFTER)[number]["noegle"];

export type Justering = "venstre" | "midt" | "hoejre";
export type Lodret = "top" | "midt" | "bund";

type Faelles = {
  id: string;
  x: number;
  y: number;
  b: number;
  h: number;
};

export type TekstElement = Faelles & {
  type: "tekst";
  tekst: string;
  skrift: SkriftNoegle;
  stoerrelse: number;
  farve: string;
  fed: boolean;
  kursiv: boolean;
  justering: Justering;
  lodret: Lodret;
  linjehoejde: number;
  // Null er gennemsigtig. Med en baggrund bliver teksten sit eget lille kort.
  baggrund: string | null;
  radius: number;
  polstring: number;
};

export type BilledElement = Faelles & {
  type: "billede";
  // Stien i bucketen 'infoskaerm', eller LOGO for klubbens eget logo.
  sti: string;
  // "fyld" fylder rammen og skærer det overskydende fra, "hele" viser hele
  // billedet inden for rammen.
  tilpasning: "fyld" | "hele";
  radius: number;
};

export type BoksElement = Faelles & {
  type: "boks";
  farve: string;
  radius: number;
  // 0–100. En halvgennemsigtig boks bag en tekst oven på et billede er den
  // almindelige måde at gøre teksten læselig på.
  opacitet: number;
};

export type DesignElement = TekstElement | BilledElement | BoksElement;

export type Design = {
  baggrund: string;
  elementer: DesignElement[];
};

// Klubbens logo ligger i public/ og ikke i Storage. Det får sin egen nøgle, så
// det kan sættes ind uden at blive lagt op.
export const LOGO = "vb-logo";

// Tekst, der byttes ud med ugeplanens besked for dagen, når skærmen tegnes.
export const BESKED_FELT = "{{besked}}";

export const GRAENSER = {
  elementer: 80,
  tekst: 2000,
  stoerrelse: { min: 8, maks: 400 },
  linjehoejde: { min: 0.7, maks: 3 },
  radius: 540,
  polstring: 200,
  minMaal: 10,
} as const;

const HEX = /^#[0-9A-Fa-f]{6}$/;

// Stier, som handlingen selv har givet ved upload: design/<uuid>.<endelse>.
// Alt andet afvises, så et design ikke kan pege på en vilkårlig fil i bucketen
// eller uden for den.
const STI = /^design\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

const ID = /^[A-Za-z0-9_-]{1,40}$/;

function tal(v: unknown, min: number, maks: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(maks, Math.max(min, Math.round(v * 100) / 100));
}

function hex(v: unknown): string | null {
  return typeof v === "string" && HEX.test(v) ? v.toUpperCase() : null;
}

function erSkrift(v: unknown): v is SkriftNoegle {
  return typeof v === "string" && SKRIFTER.some((s) => s.noegle === v);
}

// Et element fra databasen eller fra browseren er ukendte data. Funktionen
// returnerer en renset kopi eller null — aldrig det, den fik ind. Tal klemmes
// ind i deres grænser frem for at blive afvist: et element, der er trukket en
// smule ud over kanten, er ikke en fejl.
function rensElement(v: unknown): DesignElement | null {
  if (typeof v !== "object" || v === null) return null;

  const e = v as Record<string, unknown>;

  if (typeof e.id !== "string" || !ID.test(e.id)) return null;

  const x = tal(e.x, -LAERRED_B, LAERRED_B * 2);
  const y = tal(e.y, -LAERRED_H, LAERRED_H * 2);
  const b = tal(e.b, GRAENSER.minMaal, LAERRED_B * 3);
  const h = tal(e.h, GRAENSER.minMaal, LAERRED_H * 3);

  if (x === null || y === null || b === null || h === null) return null;

  const faelles = { id: e.id, x, y, b, h };
  const radius = tal(e.radius, 0, GRAENSER.radius) ?? 0;

  if (e.type === "tekst") {
    if (typeof e.tekst !== "string" || e.tekst.length > GRAENSER.tekst) return null;

    const stoerrelse = tal(e.stoerrelse, GRAENSER.stoerrelse.min, GRAENSER.stoerrelse.maks);
    const farve = hex(e.farve);
    const linjehoejde = tal(e.linjehoejde, GRAENSER.linjehoejde.min, GRAENSER.linjehoejde.maks);

    if (stoerrelse === null || farve === null || linjehoejde === null) return null;
    if (!erSkrift(e.skrift)) return null;

    const justering: Justering =
      e.justering === "midt" || e.justering === "hoejre" ? e.justering : "venstre";
    const lodret: Lodret = e.lodret === "midt" || e.lodret === "bund" ? e.lodret : "top";

    return {
      ...faelles,
      type: "tekst",
      tekst: e.tekst,
      skrift: e.skrift,
      stoerrelse,
      farve,
      fed: e.fed === true,
      kursiv: e.kursiv === true,
      justering,
      lodret,
      linjehoejde,
      baggrund: e.baggrund === null ? null : hex(e.baggrund),
      radius,
      polstring: tal(e.polstring, 0, GRAENSER.polstring) ?? 0,
    };
  }

  if (e.type === "billede") {
    if (typeof e.sti !== "string" || (e.sti !== LOGO && !STI.test(e.sti))) return null;

    return {
      ...faelles,
      type: "billede",
      sti: e.sti,
      tilpasning: e.tilpasning === "hele" ? "hele" : "fyld",
      radius,
    };
  }

  if (e.type === "boks") {
    const farve = hex(e.farve);
    if (farve === null) return null;

    return {
      ...faelles,
      type: "boks",
      farve,
      radius,
      opacitet: tal(e.opacitet, 0, 100) ?? 100,
    };
  }

  return null;
}

// Hele designet, renset. Null, hvis det ikke kan bruges.
//
// Et enkelt ugyldigt element smider hele designet ud frem for at blive sprunget
// over. Skærmen falder så tilbage til kostkortene; et design med et hul, ingen
// havde tegnet, ville se ud som en fejl på væggen.
export function rensDesign(v: unknown): Design | null {
  if (typeof v !== "object" || v === null) return null;

  const d = v as Record<string, unknown>;
  const baggrund = hex(d.baggrund);

  if (baggrund === null) return null;
  if (!Array.isArray(d.elementer) || d.elementer.length > GRAENSER.elementer) return null;

  const elementer: DesignElement[] = [];
  const ider = new Set<string>();

  for (const raa of d.elementer) {
    const element = rensElement(raa);
    if (!element || ider.has(element.id)) return null;

    ider.add(element.id);
    elementer.push(element);
  }

  return { baggrund, elementer };
}

// Stierne til billeder i Storage, som et design bruger. Logoet er ikke iblandt.
export function billedStier(design: Design | null): string[] {
  if (!design) return [];

  return design.elementer.flatMap((e) =>
    e.type === "billede" && e.sti !== LOGO ? [e.sti] : []
  );
}

export function nytId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Et design, der ligner den nuværende skærm, til at starte fra.
//
// Uden det ville editoren åbne på et tomt lærred, og den første opgave ville
// være at tegne den skærm, der allerede hænger på væggen, op igen i hånden.
export function designFraKostplan(c: DagIndhold): Design {
  const margin = 48;
  const mellemrum = 27;
  const top = 205;
  const bund = LAERRED_H - 40;
  const antal = Math.max(1, c.blocks.length);
  const kortB = (LAERRED_B - 2 * margin - (antal - 1) * mellemrum) / antal;
  const kortH = bund - top;
  const halv = (kortH - 140 - 3 * 24) / 2;

  const elementer: DesignElement[] = [
    { id: nytId(), type: "boks", x: 0, y: 0, b: LAERRED_B, h: 170, farve: c.color, radius: 0, opacitet: 100 },
    tekst(c.title, 58, 18, 1300, 90, { stoerrelse: 84, farve: c.headerTextColor, fed: true }),
    tekst(`${c.subtitleDa} / ${c.subtitleEn}`, 58, 108, 1400, 44, {
      stoerrelse: 34,
      farve: c.headerTextColor,
      fed: true,
    }),
    { id: nytId(), type: "billede", x: 1735, y: 22, b: 130, h: 130, sti: LOGO, tilpasning: "hele", radius: 0 },
  ];

  c.blocks.forEach((blok, i) => {
    const x = margin + i * (kortB + mellemrum);

    elementer.push(
      { id: nytId(), type: "boks", x, y: top, b: kortB, h: kortH, farve: "#FFFFFF", radius: 32, opacitet: 100 },
      tekst(`${blok.titleDa} / ${blok.titleEn}`, x + 24, top + 24, kortB - 48, 116, {
        stoerrelse: 52,
        farve: c.color,
        fed: true,
        justering: "midt",
        lodret: "midt",
      }),
      tekst(blok.da, x + 24, top + 164, kortB - 48, halv, {
        stoerrelse: 40,
        fed: true,
        baggrund: "#F8FAFC",
        radius: 22,
        polstring: 24,
      }),
      tekst(blok.en, x + 24, top + 188 + halv, kortB - 48, halv, {
        stoerrelse: 40,
        fed: true,
        baggrund: "#F8FAFC",
        radius: 22,
        polstring: 24,
      })
    );
  });

  return { baggrund: "#F4F6FB", elementer };
}

export function tekst(
  indhold: string,
  x: number,
  y: number,
  b: number,
  h: number,
  valg: Partial<TekstElement> = {}
): TekstElement {
  return {
    id: nytId(),
    type: "tekst",
    x,
    y,
    b,
    h,
    tekst: indhold,
    skrift: "roboto",
    stoerrelse: 48,
    farve: "#111827",
    fed: false,
    kursiv: false,
    justering: "venstre",
    lodret: "top",
    linjehoejde: 1.25,
    baggrund: null,
    radius: 0,
    polstring: 0,
    ...valg,
  };
}
