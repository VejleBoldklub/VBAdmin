// Indholdet pr. dagstype (kost-kort på dansk/engelsk).
// Porteret 1:1 fra den gamle Apps Script-løsnings Index.html (SIMPLE_CONTENT).
// Ligger som konstanter her, ligesom i den gamle løsning - hvis kostteksterne
// selv skal kunne redigeres fra Admin senere, kan dette flyttes til en
// infoskaerm_indhold-tabel i en senere fase.

export type DagFarve = 'Rød' | 'Gul' | 'Grøn';

export interface DagBlock {
  titleDa: string;
  titleEn: string;
  da: string;
  en: string;
}

export interface DagIndhold {
  title: string;
  subtitleDa: string;
  subtitleEn: string;
  shortName: string; // bruges som "Navn på dagen" - afledt af farven
  color: string;
  lightColor: string;
  headerTextColor: string;
  blocks: DagBlock[];
}

export const DAY_CONTENT: Record<DagFarve, DagIndhold> = {
  Rød: {
    title: 'Rød',
    subtitleDa: 'Performance (MD-1 og MD)',
    subtitleEn: 'Performance (MD-1 and MD)',
    shortName: 'Performance',
    color: '#B91C1C',
    lightColor: '#FEE2E2',
    headerTextColor: '#FFFFFF',
    blocks: [
      {
        titleDa: 'Morgenmad',
        titleEn: 'Breakfast',
        da: 'Cornflakes/havregryn\nHvidt brød med marmelade/honning\nJuice',
        en: 'Cornflakes/oats\nWhite bread with jam/honey\nJuice',
      },
      {
        titleDa: 'Middag',
        titleEn: 'Lunch',
        da: 'Hvid pasta/ris\n350 g til alle\nMagert kød: fisk/kylling',
        en: 'White pasta/rice\n350 g for everyone\nLean meat: fish/chicken',
      },
      {
        titleDa: 'Kamp',
        titleEn: 'Match',
        da: 'Snacks tæt på kamp\nGel 10 min før kickoff\nGel i halvleg\nRecovery-drik efter kamp',
        en: 'Snacks close to match\nGel 10 min before kickoff\nGel at half-time\nRecovery drink after match',
      },
    ],
  },

  Gul: {
    title: 'Gul',
    subtitleDa: 'Recovery (MD+1)',
    subtitleEn: 'Recovery (MD+1)',
    shortName: 'Recovery',
    color: '#D6A800',
    lightColor: '#FFF7C2',
    headerTextColor: '#111827',
    blocks: [
      {
        titleDa: 'Morgenmad',
        titleEn: 'Breakfast',
        da: 'Æg\nCornflakes og havregryn\nGræsk yoghurt\nBær og tart cherry',
        en: 'Eggs\nCornflakes and oats\nGreek yoghurt\nBerries and tart cherry',
      },
      {
        titleDa: 'Middag',
        titleEn: 'Lunch',
        da: 'Fisk, kylling, kalkun\nKartofler, majs, ærter, rødbeder, gulerødder\nHvid pasta/ris',
        en: 'Fish, chicken, turkey\nPotatoes, corn, peas, beetroot, carrots\nWhite pasta/rice',
      },
      {
        titleDa: 'Makroer',
        titleEn: 'Macros',
        da: 'Højt kulhydratindtag\nHøjt proteinindtag\nLavt mættet fedt\nModerat fiberindtag',
        en: 'High carbohydrate intake\nHigh protein intake\nLow saturated fat\nModerate fibre intake',
      },
    ],
  },

  Grøn: {
    title: 'Grøn',
    subtitleDa: 'General Health (øvrige dage)',
    subtitleEn: 'General Health (other days)',
    shortName: 'Health',
    color: '#2E8B2E',
    lightColor: '#E3F7E3',
    headerTextColor: '#FFFFFF',
    blocks: [
      {
        titleDa: 'Grundprincip',
        titleEn: 'Main principle',
        da: 'Halvdelen af tallerkenen grønt\nProtein og fibre\nUmættet fedt\nKomplekse kulhydrater',
        en: 'Half the plate vegetables\nProtein and fibre\nUnsaturated fat\nComplex carbohydrates',
      },
      {
        titleDa: 'Morgenmad',
        titleEn: 'Breakfast',
        da: 'Æg\nHavregryn\nFrugt\nGræsk yoghurt / skyr med honning',
        en: 'Eggs\nOats\nFruit\nGreek yoghurt / skyr with honey',
      },
      {
        titleDa: 'Middag',
        titleEn: 'Lunch',
        da: 'Salater i regnbuens farver\nOkse, fisk, kylling\nMørk ris/pasta eller kartofler med skræl',
        en: 'Colourful salads\nBeef, fish, chicken\nBrown rice/pasta or potatoes with skin',
      },
    ],
  },
};

export function farveTilNavn(farve: DagFarve): string {
  return DAY_CONTENT[farve].shortName;
}

// ---------------------------------------------------------------------------
// Indhold fra infoskaerm_indhold
//
// DAY_CONTENT ovenfor er ikke længere den eneste kilde, men den er stadig
// reserven. Kan en farve ikke hentes eller består rækken ikke kontrollen, viser
// skærmen den hardcodede udgave. En skærm i et cafeteria uden opsyn skal hellere
// vise et forældet kostråd end ingenting.
// ---------------------------------------------------------------------------

export interface IndholdBlokRow {
  titel_da: string;
  titel_en: string;
  tekst_da: string;
  tekst_en: string;
}

export interface IndholdRow {
  farve: DagFarve;
  titel: string;
  undertitel_da: string;
  undertitel_en: string;
  kortnavn: string;
  farvekode: string;
  lys_farvekode: string;
  blokke: IndholdBlokRow[];
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

// Tekstfarven på headeren udregnes frem for at være et felt, nogen skal huske
// at rette med. Formlen er den gængse YIQ-lysstyrke; grænsen ved 150 giver
// præcis de tre værdier, indholdet havde i forvejen — mørk tekst på gul, hvid
// på rød og grøn — og holder også en ny farvekode læselig.
export function headerTekstFarve(baggrund: string): string {
  if (!HEX.test(baggrund)) return "#FFFFFF";

  const r = parseInt(baggrund.slice(1, 3), 16);
  const g = parseInt(baggrund.slice(3, 5), 16);
  const b = parseInt(baggrund.slice(5, 7), 16);

  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#111827" : "#FFFFFF";
}

function erBlok(vaerdi: unknown): vaerdi is IndholdBlokRow {
  if (typeof vaerdi !== "object" || vaerdi === null) return false;

  const b = vaerdi as Record<string, unknown>;

  return (
    typeof b.titel_da === "string" &&
    typeof b.titel_en === "string" &&
    typeof b.tekst_da === "string" &&
    typeof b.tekst_en === "string"
  );
}

export function erIndholdRow(vaerdi: unknown): vaerdi is IndholdRow {
  if (typeof vaerdi !== "object" || vaerdi === null) return false;

  const r = vaerdi as Record<string, unknown>;

  return (
    typeof r.farve === "string" &&
    r.farve in DAY_CONTENT &&
    typeof r.titel === "string" &&
    typeof r.undertitel_da === "string" &&
    typeof r.undertitel_en === "string" &&
    typeof r.kortnavn === "string" &&
    typeof r.farvekode === "string" &&
    HEX.test(r.farvekode) &&
    typeof r.lys_farvekode === "string" &&
    HEX.test(r.lys_farvekode) &&
    Array.isArray(r.blokke) &&
    r.blokke.every(erBlok)
  );
}

export function tilDagIndhold(row: IndholdRow): DagIndhold {
  return {
    title: row.titel,
    subtitleDa: row.undertitel_da,
    subtitleEn: row.undertitel_en,
    shortName: row.kortnavn,
    color: row.farvekode,
    lightColor: row.lys_farvekode,
    headerTextColor: headerTekstFarve(row.farvekode),
    blocks: row.blokke.map((b) => ({
      titleDa: b.titel_da,
      titleEn: b.titel_en,
      da: b.tekst_da,
      en: b.tekst_en,
    })),
  };
}

// Den anden vej, til adminfladens formular og til seed-værdier.
export function fraDagIndhold(farve: DagFarve, indhold: DagIndhold): IndholdRow {
  return {
    farve,
    titel: indhold.title,
    undertitel_da: indhold.subtitleDa,
    undertitel_en: indhold.subtitleEn,
    kortnavn: indhold.shortName,
    farvekode: indhold.color,
    lys_farvekode: indhold.lightColor,
    blokke: indhold.blocks.map((b) => ({
      titel_da: b.titleDa,
      titel_en: b.titleEn,
      tekst_da: b.da,
      tekst_en: b.en,
    })),
  };
}
