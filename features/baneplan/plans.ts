export type PlanSlug = "efteraar-foraar" | "vinter";

export type Baneplan = {
  adminPath: `/admin/baneplan/${PlanSlug}`;
  name: string;
  publicPath: `/baneplan/${PlanSlug}`;
  seasonTitle: string;
  slug: PlanSlug;
};

export const baneplaner: readonly Baneplan[] = [
  {
    slug: "efteraar-foraar",
    name: "Efterår / Forår",
    seasonTitle: "Efterår / Forår",
    adminPath: "/admin/baneplan/efteraar-foraar",
    publicPath: "/baneplan/efteraar-foraar",
  },
  {
    slug: "vinter",
    name: "Vinter",
    seasonTitle: "Vinter",
    adminPath: "/admin/baneplan/vinter",
    publicPath: "/baneplan/vinter",
  },
];

export function findBaneplan(slug: string) {
  return baneplaner.find((plan) => plan.slug === slug);
}
