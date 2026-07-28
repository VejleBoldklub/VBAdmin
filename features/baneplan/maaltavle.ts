import type { Maaltavle, MaaltavleRaekke } from "./types";

export type MaaltavleKolonne = {
  vaerdi: string;
  // Antal baner kolonnen dækker. 1 i næsten alle tilfælde.
  span: number;
  // Navnene på de baner kolonnen dækker. Nødvendige fordi kolonneindekset ikke
  // svarer til baneindekset, når celler er slået sammen.
  baner: string[];
  // Indeks i rækkens celler, eller null når ingen celle dækker banen.
  celleIndex: number | null;
};

// Oversætter en række til kolonner i banernes rækkefølge.
//
// Celler slås kun sammen, når det er den SAMME celle der dækker flere baner ved
// siden af hinanden. To naboer med tilfældigvis samme værdi må ikke smelte
// sammen — det ville påstå en sammenhæng, der ikke står i dataene.
//
// Dækkes en bane ikke af nogen celle, vises "-". Det holder tavlen i hak, når en
// bane tilføjes til planen uden at måltavlen er opdateret.
//
// Delt mellem den offentlige visning og redigeringsformularen, så de to altid
// viser samme struktur.
export function maaltavleKolonner(raekke: MaaltavleRaekke, baner: string[]): MaaltavleKolonne[] {
  const ud: MaaltavleKolonne[] = [];
  let forrige = -1;

  for (const bane of baner) {
    const idx = raekke.celler.findIndex((c) => c.baner.includes(bane));
    if (idx !== -1 && idx === forrige) {
      ud[ud.length - 1].span += 1;
      ud[ud.length - 1].baner.push(bane);
    } else {
      ud.push({
        vaerdi: idx === -1 ? "-" : raekke.celler[idx].vaerdi,
        span: 1,
        baner: [bane],
        celleIndex: idx === -1 ? null : idx,
      });
    }
    forrige = idx;
  }

  return ud;
}

// Retter én celles værdi. Returnerer en ny tavle; rører ikke den oprindelige.
//
// Sammenlægningen ændres ikke — en celle der dækker to baner bliver ved med at
// gøre det. Redigering handler om værdier, ikke om tavlens struktur.
export function saetMaaltavleVaerdi(
  tavle: Maaltavle,
  raekkeIndex: number,
  celleIndex: number,
  vaerdi: string
): Maaltavle {
  return {
    raekker: tavle.raekker.map((r, ri) =>
      ri !== raekkeIndex
        ? r
        : {
            ...r,
            celler: r.celler.map((c, ci) => (ci !== celleIndex ? c : { ...c, vaerdi })),
          }
    ),
  };
}
