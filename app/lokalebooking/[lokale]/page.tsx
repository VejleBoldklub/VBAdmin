import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  dagensSlots,
  GITTER_FRA,
  GITTER_TIL,
  tilDagBookinger,
} from "@/features/lokalebooking/gitter";
import { findLokale, lokaler } from "@/features/lokalebooking/lokaler";
import { hentOptagethed } from "@/features/lokalebooking/optagethed";
import { opretBooking } from "@/features/lokalebooking/opret";
import {
  danskTid,
  danskTidTilInstant,
  MAKS_MAANEDER_FREM,
} from "@/features/lokalebooking/regler";
import {
  isoDagFor,
  mandagForUge,
  naboUge,
  ugensDatoer,
  ugeNoegleNu,
  ugeTitel,
} from "@/features/lokalebooking/uge";
import { Husregler } from "@/components/lokalebooking/husregler";
import BookingPanel from "./booking-panel";

type LokalebookingPageProps = {
  params: Promise<{ lokale: string }>;
  searchParams: Promise<{ uge?: string; embed?: string }>;
};

// Indlejret tilstand: siden vises i en iframe på klubbens hjemmeside.
//
// Valgt som en parameter på de eksisterende ruter frem for en selvstændig
// /embed-rute. Ruten, dataindhentningen og formularhandlingen er præcis de samme
// — kun fanerne og lokalets beskrivelse falder væk — og en kopi af siden ville
// skulle holdes i takt med denne for altid.
//
// Forskellen er ikke kosmetisk. Uden for iframen kan man skifte lokale med
// fanerne øverst; det er praktisk, når vi selv slår noget op. Inde i en iframe,
// der på klubbens side står under overskriften "Book mødelokalet", ville de samme
// faner betyde, at en besøgende kunne ende med at booke cafeteriet uden at opdage
// det. Derfor findes fanerne slet ikke i indlejret tilstand — de er ikke bare
// skjult med CSS.
function erIndlejret(vaerdi: string | undefined): boolean {
  return vaerdi === "1";
}

// Optagetheden må ikke caches. En uge, der viser noget andet end databasen, får
// folk til at udfylde formularen for et tidsrum, der er taget — og modsat til at
// tro, at et ledigt lokale er optaget.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LokalebookingPageProps): Promise<Metadata> {
  const { lokale: slug } = await params;
  const lokale = findLokale(slug);

  return {
    title: lokale ? `Book ${lokale.navn} · Vejle Boldklub` : "Lokalebooking",
    // Siden vises i en iframe på klubbens hjemmeside og skal ikke konkurrere med
    // den side om søgeresultater. Samme valg som de offentlige baneplansider.
    robots: { index: false, follow: false },
  };
}

export default async function LokalebookingPage({
  params,
  searchParams,
}: LokalebookingPageProps) {
  const { lokale: slug } = await params;
  const lokale = findLokale(slug);

  if (!lokale) {
    notFound();
  }

  const nu = new Date();
  const iDag = danskTid(nu);

  // Ugen kommer fra URL'en og kan være hvad som helst. Er den ikke en gyldig uge,
  // vises den aktuelle frem for en fejlside: en besøgende i klubbens iframe skal
  // ikke rammes af et forkert link.
  const sp = await searchParams;
  const indlejret = erIndlejret(sp.embed);

  const oensketUge = sp.uge;
  const uge = oensketUge && mandagForUge(oensketUge) ? oensketUge : ugeNoegleNu(nu);
  const mandag = mandagForUge(uge)!;
  const datoer = ugensDatoer(mandag);

  const optagethed = await hentOptagethed(
    lokale.slug,
    danskTidTilInstant(datoer[0], GITTER_FRA),
    danskTidTilInstant(datoer[6], GITTER_TIL)
  );

  const dagBookinger = optagethed.ok ? tilDagBookinger(optagethed.bookinger) : [];
  const slots = datoer.map((dato) => dagensSlots(dato, isoDagFor(dato), dagBookinger, nu));

  const seksMaanederFrem = new Date(nu.getTime());
  seksMaanederFrem.setUTCMonth(seksMaanederFrem.getUTCMonth() + MAKS_MAANEDER_FREM);

  // Bindes på serveren frem for at sende lokalet med som et skjult felt i
  // formularen. Hvilket lokale der bookes, afgør både startstatus og
  // godkendelsesflow, og det skal ikke kunne ændres af den, der sender
  // formularen.
  const handling = opretBooking.bind(null, lokale.slug);

  // Tilstanden skal med i hvert ugelink. Uden det ville et klik på "Næste" føre
  // ud af indlejret tilstand, og fanerne ville dukke op midt i klubbens side.
  const ugeSti = (noegle: string) =>
    `/lokalebooking/${lokale.slug}?uge=${noegle}${indlejret ? "&embed=1" : ""}`;

  return (
    <main
      className={`min-h-screen bg-white text-slate-950 ${
        indlejret ? "px-3 py-3 sm:px-4 sm:py-4" : "px-3 py-4 sm:px-5 sm:py-6"
      }`}
    >
      <div className="mx-auto w-full max-w-5xl">
        {/* Hverken her eller udenfor tegnes klubbens logo eller adminskallen.
            Klubbens CMS leverer den ramme.

            Overskriften står derimod på siden i BEGGE tilstande, og den skal
            blive stående. En iframe kan være lav nok til, at kun toppen er
            synlig uden at scrolle, og lokalets navn står ellers først nede ved
            formularen. Uden overskriften her kunne en besøgende booke cafeteriet
            i den tro, at det var mødelokalet — netop det, fjernelsen af fanerne
            skulle forhindre.

            Klubbens egen overskrift lige over iframen gentager den muligvis. Det
            er en pris, det er værd at betale: en gentagelse er til at se bort
            fra, en forveksling er ikke. */}
        {indlejret ? (
          <h1 className="mb-4 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Book {lokale.navn}
          </h1>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Book {lokale.navn}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">{lokale.beskrivelse}</p>

            <nav
              aria-label="Lokaler"
              className="mt-4 flex overflow-hidden rounded-lg border border-slate-200"
            >
              {lokaler.map((l) => {
                const aktiv = l.slug === lokale.slug;
                return (
                  <Link
                    key={l.slug}
                    href={l.publicPath}
                    aria-current={aktiv ? "page" : undefined}
                    className={`flex-1 border-r border-slate-200 px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 ${
                      aktiv
                        ? "bg-red-700 text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {l.navn}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* Reglerne står over kalenderen i begge tilstande. De skal læses, før
            der vælges et tidsrum — står de under formularen, er bookingen for
            længst lavet, når de bliver set. */}
        <div className={indlejret ? "" : "mt-5"}>
          <Husregler regler={lokale.regler} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-950">{ugeTitel(uge)}</p>

          {/* Ugeskift er almindelige links, ikke klientkode. Next skifter siden
              uden at genindlæse den, så en halvt udfyldt formular bliver stående,
              mens gitteret opdateres. */}
          <div className="flex items-center gap-2">
            <Link
              href={ugeSti(naboUge(uge, -1))}
              scroll={false}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              ← Forrige
            </Link>
            <Link
              href={ugeSti(ugeNoegleNu(nu))}
              scroll={false}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              I dag
            </Link>
            <Link
              href={ugeSti(naboUge(uge, 1))}
              scroll={false}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              Næste →
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <BookingPanel
            lokaleNavn={lokale.navn}
            kraeverGodkendelse={lokale.kraeverGodkendelse}
            datoer={datoer}
            slots={slots}
            iDag={iDag.dato}
            nuMinutter={iDag.minutter}
            maksDato={danskTid(seksMaanederFrem).dato}
            kunneIkkeLaese={!optagethed.ok}
            handling={handling}
          />
        </div>
      </div>
    </main>
  );
}
