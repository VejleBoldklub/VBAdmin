import type { PlanSlug } from "./plans";

export type Category = "piger" | "drenge" | "akademi" | "future" | "reserveret";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "piger", label: "Piger" },
  { value: "drenge", label: "Drenge" },
  { value: "akademi", label: "Akademi" },
  { value: "future", label: "Future Vejle" },
  { value: "reserveret", label: "Reserveret / blokeret" },
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

export type BaneplanData = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
};

export type BaneplanStatus = "draft" | "live" | "archived";

export type BaneplanVersion = {
  id: string;
  plan_slug: PlanSlug;
  saesontitel: string;
  data: BaneplanData;
  status: BaneplanStatus;
  ikrafttraedelsesdato: string | null;
  oprettet_af: string | null;
  created_at: string;
  updated_at: string;
};

export function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}.${String(min).padStart(2, "0")}`;
}
