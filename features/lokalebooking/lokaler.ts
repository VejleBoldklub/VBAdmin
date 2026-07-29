export type LokaleSlug = "moedelokale" | "cafeteria";

export type Lokale = {
  slug: LokaleSlug;
  navn: string;
  // Kort forklaring vist på den offentlige side.
  beskrivelse: string;
  publicPath: `/lokalebooking/${LokaleSlug}`;
  // Adminfladen er én samlet liste over begge lokaler, ikke en side pr. lokale.
  // Stien her er derfor listen med lokalefiltret sat.
  adminPath: `/admin/lokalebooking?lokale=${LokaleSlug}`;
  // Kræver godkendelse, før bookingen er bekræftet. Afgør både startstatus og
  // om der sendes en notifikation til godkenderen.
  kraeverGodkendelse: boolean;
};

// De to ressourcer er faste og ligger i koden, ikke i en tabel — samme valg som
// baneplanerne i features/baneplan/plans.ts. Kommer der flere lokaler, hører de
// stadig her, indtil klubben har brug for selv at oprette dem.
export const lokaler: readonly Lokale[] = [
  {
    slug: "moedelokale",
    navn: "Mødelokale (1. sal)",
    beskrivelse: "Bookes direkte og er bekræftet med det samme.",
    publicPath: "/lokalebooking/moedelokale",
    adminPath: "/admin/lokalebooking?lokale=moedelokale",
    kraeverGodkendelse: false,
  },
  {
    slug: "cafeteria",
    navn: "Cafeteria",
    beskrivelse: "Bookes efter godkendelse. Du får besked, når bookingen er behandlet.",
    publicPath: "/lokalebooking/cafeteria",
    adminPath: "/admin/lokalebooking?lokale=cafeteria",
    kraeverGodkendelse: true,
  },
];

export function findLokale(slug: string): Lokale | undefined {
  return lokaler.find((l) => l.slug === slug);
}

// Startstatus ved oprettelse. Skal stemme med rækkesikkerhedspolicyen i
// supabase/lokalebooking-skema.sql, som afviser enhver anden kombination af
// lokale og status.
export function startStatus(lokale: Lokale): "afventer" | "bekraeftet" {
  return lokale.kraeverGodkendelse ? "afventer" : "bekraeftet";
}
