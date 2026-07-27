import type { PlanSlug } from "./plans";

export type Tildeling = {
  bane: string;
  dag: string;
  starttid: string;
  sluttid: string;
  hold: string;
};

export type BaneplanData = {
  tildelinger: Tildeling[];
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
