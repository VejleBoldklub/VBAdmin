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
  // Den, der har lokalet på sit bord. Får notifikationen om nye bookinger, der
  // skal godkendes, og står som Reply-To på mails om lokalet, så et svar fra
  // bookeren lander hos et menneske og ikke i afsenderpostkassen.
  //
  // null betyder, at der ikke er en særskilt ansvarlig; så bruges afsenderen.
  ansvarligEmail: string | null;
  // Klubbens spilleregler for lokalet, vist øverst på bookingsiden.
  //
  // Teksten er klubbens, ikke vores, og er overtaget ordret fra de gamle
  // SuperSaaS-sider. Ret den kun efter aftale.
  regler: readonly string[];
};

// De tre første regler gælder begge lokaler. De står ét sted, så en rettelse ikke
// kan komme til kun at gælde det ene.
const FAELLES_REGLER = [
  "Book kun den tid du har brug for, eller forventer at bruge.",
  'Book ikke "måske"-aftaler, som så ikke bliver til noget.',
  // Der findes endnu ingen selvbetjent sletning: slet_egen_booking ligger i
  // databasen, men hverken brugerflade eller mail-link er bygget. Teksten peger
  // derfor på en person frem for på en knap, der ikke findes. Bygges sletningen,
  // skal denne linje rettes tilbage.
  "Bliver din booking aflyst, så kontakt kim.schwartz@vejleboldklub.dk for at få den slettet.",
] as const;

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
    ansvarligEmail: null,
    regler: FAELLES_REGLER,
  },
  {
    slug: "cafeteria",
    navn: "Cafeteria",
    beskrivelse: "Bookes efter godkendelse. Du får besked, når bookingen er behandlet.",
    publicPath: "/lokalebooking/cafeteria",
    adminPath: "/admin/lokalebooking?lokale=cafeteria",
    kraeverGodkendelse: true,
    ansvarligEmail: "cafeteria@vejleboldklub.dk",
    regler: [
      ...FAELLES_REGLER,
      "OBS! Reservationer af cafeteriet er først godkendt når cafeteriet har accepteret reservationen. Cafeteriet modtager en mail når der laves en ny reservation.",
      "Ændres der i bordopstilling, skal borde stilles tilbage igen.",
      "Borde tørres af.",
      "Stole stilles pænt på plads.",
      "Affald smides ud.",
    ],
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
