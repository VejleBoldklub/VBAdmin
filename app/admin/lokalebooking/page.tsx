import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { hentAfventende, hentBookinger, MAKS_RAEKKER } from "@/features/lokalebooking/bookinger";
import { findLokale, lokaler, type LokaleSlug } from "@/features/lokalebooking/lokaler";
import { tidsrumDelt } from "@/features/lokalebooking/regler";
import type { BookingFilter, BookingStatus } from "@/features/lokalebooking/types";
import AfventerKort from "./afventer-kort";
import BookingTabel from "./booking-tabel";
import Filtre from "./filtre";

type AdminLokalebookingProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Bookinger ændrer sig, og en administrator skal se dem, som de er nu. Der er
// intet at cache her.
export const dynamic = "force-dynamic";

// `satisfies` frem for en type-annotation: så er det en fejl at skrive en status,
// der ikke findes, og listen kan stadig bruges til at genkende en værdi fra URL'en.
const STATUSSER = ["afventer", "bekraeftet", "afvist", "aflyst"] as const satisfies
  readonly BookingStatus[];

// Filtrene kommer fra URL'en og kan være hvad som helst. Ukendte værdier bliver
// "alle" frem for en fejlside — et forkert link skal ikke koste adgangen til
// listen.
function laesFilter(sp: Record<string, string | string[] | undefined>): BookingFilter {
  const enkelt = (navn: string): string | undefined => {
    const v = sp[navn];
    return Array.isArray(v) ? v[0] : v;
  };

  const lokale = enkelt("lokale");
  const status = enkelt("status");
  const periode = enkelt("periode");

  return {
    lokale: lokaler.some((l) => l.slug === lokale) ? (lokale as LokaleSlug) : "alle",
    status: STATUSSER.some((s) => s === status) ? (status as BookingStatus) : "alle",
    periode: periode === "alle" ? "alle" : "kommende",
  };
}

export default async function AdminLokalebookingPage({ searchParams }: AdminLokalebookingProps) {
  const filter = laesFilter(await searchParams);

  // Køen hentes uafhængigt af filtrene, så den ikke kan skjules ved et uheld.
  const [afventende, liste] = await Promise.all([hentAfventende(), hentBookinger(filter)]);

  const nu = new Date();

  return (
    <AdminPageShell eyebrow="Lokalebooking" title="Bookinger" wide>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Alle bookinger af mødelokalet og cafeteriet. Mødelokalet bekræftes med det samme, mens
        cafeteriet skal godkendes her.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {lokaler.map((lokale) => (
          <Link
            key={lokale.slug}
            href={lokale.publicPath}
            prefetch={false}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Åbn bookingsiden for {lokale.navn}
          </Link>
        ))}
      </div>

      <section className="mt-8" aria-labelledby="afventer-titel">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="afventer-titel" className="text-lg font-bold tracking-tight text-slate-950">
            Afventer godkendelse
          </h2>
          {afventende.length > 0 && (
            <span className="rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white">
              {afventende.length}{" "}
              {afventende.length === 1 ? "booking venter" : "bookinger venter"}
            </span>
          )}
        </div>

        {afventende.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            Ingen cafeteria-bookinger venter på godkendelse.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              Kun cafeteriet skal godkendes. Tidsrummet er reserveret, så længe bookingen afventer,
              og bliver ledigt igen, hvis den afvises.
            </p>
            <div className="mt-4 grid gap-4">
              {afventende.map((booking) => {
                const start = new Date(booking.start_tid);
                const slut = new Date(booking.slut_tid);
                const { dag, klokke } = tidsrumDelt(start, slut);

                return (
                  <AfventerKort
                    key={booking.id}
                    booking={booking}
                    dag={dag}
                    klokke={klokke}
                    erPasseret={slut.getTime() < nu.getTime()}
                  />
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="mt-10" aria-labelledby="alle-titel">
        <h2 id="alle-titel" className="text-lg font-bold tracking-tight text-slate-950">
          Alle bookinger
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Sorteret efter starttidspunkt.{" "}
          {filter.lokale === "alle"
            ? "Begge lokaler."
            : `Kun ${findLokale(filter.lokale)?.navn ?? filter.lokale}.`}
        </p>

        <div className="mt-4 grid gap-4">
          <Filtre
            filter={filter}
            antal={liste.bookinger.length}
            afkortet={liste.afkortet}
            maks={MAKS_RAEKKER}
          />
          <BookingTabel bookinger={liste.bookinger} />
        </div>
      </section>
    </AdminPageShell>
  );
}
