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
