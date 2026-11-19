// Signage: typer og grænser, delt af adminfladen, playeren og handlingerne.
//
// Filen har med vilje ingen importer, så klientkomponenter kan bruge den uden
// at trække serverkode med sig. Tabellerne står i supabase/signage.sql, og
// grænserne her skal svare til check-constraints dér.

export const BUCKET = "signage";

export const ELEMENT_TYPER = ["billede", "video", "tekst", "web", "infoskaerm"] as const;
export type ElementType = (typeof ELEMENT_TYPER)[number];

export const ELEMENT_NAVNE: Record<ElementType, string> = {
  billede: "Billede",
  video: "Video",
  tekst: "Tekst-slide",
  web: "Webside",
  infoskaerm: "Infoskærm Cafeteria",
};

export const TILPASNINGER = ["contain", "cover"] as const;
export type Tilpasning = (typeof TILPASNINGER)[number];

export const OVERGANGE = ["ingen", "fade", "slide"] as const;
export type Overgang = (typeof OVERGANGE)[number];

export const JUSTERINGER = ["venstre", "center"] as const;
export type Justering = (typeof JUSTERINGER)[number];

export const MEDIE_TYPER: Record<string, "billede" | "video"> = {
  "image/jpeg": "billede",
  "image/png": "billede",
  "image/webp": "billede",
  "image/gif": "billede",
  "video/mp4": "video",
  "video/webm": "video",
};

export const MEDIE_MAKS_BYTES = 500 * 1024 * 1024;

export type Skaerm = {
  id: string;
  navn: string;
  slug: string;
  placering: string;
  aktiv: boolean;
  tilpasning: Tilpasning;
  overgang: Overgang;
  overgangMs: number;
  baggrund: string;
  standardSekunder: number;
  lyd: boolean;
  opdaterSekunder: number;
  visUr: boolean;
  taendFra: string | null;
  taendTil: string | null;
  sidstSet: string | null;
};

export type Medie = {
  id: string;
  navn: string;
  type: "billede" | "video";
  sti: string;
  mime: string;
  bytes: number;
  url: string;
  oprettet: string;
};

export type Element = {
  id: string;
  skaermId: string;
  type: ElementType;
  medieId: string | null;
  titel: string;
  tekst: string;
  url: string;
  sekunder: number | null;
  tilpasning: Tilpasning | null;
  baggrund: string;
  tekstfarve: string;
  justering: Justering;
  raekkefoelge: number;
  aktiv: boolean;
  fraDato: string | null;
  tilDato: string | null;
  ugedage: number[];
  fraTid: string | null;
  tilTid: string | null;
};

// Det, playeren får: elementet med medieadressen slået op.
export type PlayerElement = Element & { medieUrl: string | null; medieType: "billede" | "video" | null };

export type PlayerData = { skaerm: Skaerm; elementer: PlayerElement[] };

// De felter, adminfladen sender, når et element oprettes eller rettes.
export type ElementFelter = {
  type: ElementType;
  medieId: string | null;
  titel: string;
  tekst: string;
  url: string;
  sekunder: number | null;
  tilpasning: Tilpasning | null;
  baggrund: string;
  tekstfarve: string;
  justering: Justering;
  aktiv: boolean;
  fraDato: string | null;
  tilDato: string | null;
  ugedage: number[];
  fraTid: string | null;
  tilTid: string | null;
};

export type SkaermFelter = {
  navn: string;
  slug: string;
  placering: string;
  aktiv: boolean;
  tilpasning: Tilpasning;
  overgang: Overgang;
  overgangMs: number;
  baggrund: string;
  standardSekunder: number;
  lyd: boolean;
  opdaterSekunder: number;
  visUr: boolean;
  taendFra: string | null;
  taendTil: string | null;
};

export type Resultat = { ok: true } | { ok: false; fejl: string };
export type ResultatMed<T> = { ok: true; data: T } | { ok: false; fejl: string };

export const UGEDAGE = [
  { nr: 1, kort: "Man" },
  { nr: 2, kort: "Tir" },
  { nr: 3, kort: "Ons" },
  { nr: 4, kort: "Tor" },
  { nr: 5, kort: "Fre" },
  { nr: 6, kort: "Lør" },
  { nr: 7, kort: "Søn" },
] as const;

export function lavSlug(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export const SLUG_FORM = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
export const FARVE_FORM = /^#[0-9a-fA-F]{6}$/;
export const TID_FORM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function tomtElement(type: ElementType): ElementFelter {
  return {
    type,
    medieId: null,
    titel: "",
    tekst: "",
    url: "",
    sekunder: null,
    tilpasning: null,
    baggrund: "#b91c1c",
    tekstfarve: "#ffffff",
    justering: "center",
    aktiv: true,
    fraDato: null,
    tilDato: null,
    ugedage: [1, 2, 3, 4, 5, 6, 7],
    fraTid: null,
    tilTid: null,
  };
}

export function felterFraElement(e: Element): ElementFelter {
  return {
    type: e.type,
    medieId: e.medieId,
    titel: e.titel,
    tekst: e.tekst,
    url: e.url,
    sekunder: e.sekunder,
    tilpasning: e.tilpasning,
    baggrund: e.baggrund,
    tekstfarve: e.tekstfarve,
    justering: e.justering,
    aktiv: e.aktiv,
    fraDato: e.fraDato,
    tilDato: e.tilDato,
    ugedage: e.ugedage,
    fraTid: e.fraTid,
    tilTid: e.tilTid,
  };
}

// Færdige tekst-slides at starte fra i Content Studio og Screen Manager.
export const SKABELONER: { navn: string; felter: Partial<ElementFelter> }[] = [
  { navn: "Velkomst", felter: { titel: "Velkommen til VB", tekst: "Cafeteria", baggrund: "#b91c1c", tekstfarve: "#ffffff" } },
  { navn: "Kampdag", felter: { titel: "Kampdag", tekst: "VB – modstander\nLørdag kl. 15.00", baggrund: "#0b1426", tekstfarve: "#ffffff" } },
  { navn: "Sponsorer", felter: { titel: "Tak til vores sponsorer", tekst: "", baggrund: "#ffffff", tekstfarve: "#b91c1c" } },
  { navn: "Info", felter: { titel: "Info", tekst: "Skriv beskeden her", baggrund: "#1e293b", tekstfarve: "#ffffff", justering: "venstre" } },
];
