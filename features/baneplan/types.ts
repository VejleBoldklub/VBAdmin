import type { PlanSlug } from "./plans";

export type Category = "piger" | "drenge" | "akademi" | "future" | "reserveret";

// Labelen er tekst til skærmen; værdien står i planens gemte data. Derfor må
// "reserveret" ikke omdøbes, selv om den kaldes en spærring i UI'et — det ville
// gøre kategorien ulæselig i alle eksisterende planer.
//
// En spærring er en kategori på lige fod med holdkategorierne og ikke en
// markering oveni: den står i stedet for et hold, ikke sammen med et. Et
// selvstændigt felt ville tillade tilstande som "Drenge, men spærret" og tvinge
// hver visning til at afgøre, om feltet eller kategorien bestemmer farven.
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "piger", label: "Piger" },
  { value: "drenge", label: "Drenge" },
  { value: "akademi", label: "Akademi" },
  { value: "future", label: "Future Vejle" },
  { value: "reserveret", label: "Spærring / reserveret" },
];

export const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

export type ScheduleField = {
  name: string;
  type?: string; // fx "Kunst"
};

export type ScheduleEvent = {
  id: string;
  day: string;
  team: string;
  start: number; // minutter siden midnat, fx 16:45 = 1005
  end: number;
  field: string; // matcher ScheduleField.name
  room?: string; // omklædningsrum, "-" hvis ingen
  category: Category;
};

// Måloversigten nederst på den offentlige baneplan: hvilke måltyper der står på
// hvilke baner. Det er stamdata om parken, ikke en del af sæsonens tildelinger,
// og ændres derfor sjældent.
//
// En celle peger på de baner den dækker ved navn frem for ved kolonneposition.
// To fordele: den oprindelige tavle har celler slået sammen over to baner, og
// navneopslag gør tavlen robust, når en bane tilføjes eller fjernes — en ny bane
// får ingen værdi, og en fjernet bane forsvinder af sig selv.
export type MaaltavleCelle = {
  baner: string[];
  vaerdi: string;
};

export type MaaltavleRaekke = {
  // Måltypen, fx "3-mands" eller "11-mands".
  type: string;
  celler: MaaltavleCelle[];
};

export type Maaltavle = {
  raekker: MaaltavleRaekke[];
};

export type BaneplanData = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
  // Valgfri. Vinterplanen har ingen måloversigt, fordi alle mål om vinteren er
  // samlet på to baner, og der derfor ikke er en fordeling at vise.
  maaltavle?: Maaltavle;
};

export type BaneplanStatus = "draft" | "live" | "archived";

export type BaneplanVersion = {
  id: string;
  plan_slug: PlanSlug;
  saesontitel: string;
  data: BaneplanData;
  status: BaneplanStatus;
  oprettet_af: string | null;
  created_at: string;
  updated_at: string;
};

// Visningsformat i baneplanen: 1005 -> "16.45"
export function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}.${String(min).padStart(2, "0")}`;
}

// Til og fra <input type="time">, som kræver kolon: "16:45" <-> 1005
export function tidTilMinutter(tekst: string): number {
  const [t, m] = tekst.split(":").map(Number);
  return (t || 0) * 60 + (m || 0);
}

export function minutterTilTid(min: number): string {
  const t = Math.floor(min / 60);
  const m = min % 60;
  return `${String(t).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
