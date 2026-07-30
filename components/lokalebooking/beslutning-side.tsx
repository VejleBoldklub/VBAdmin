import BeslutningForm from "@/components/lokalebooking/beslutning-form";
import { StatusMaerke } from "@/components/lokalebooking/status-maerke";
import { findLokale } from "@/features/lokalebooking/lokaler";
import { tidsrumTekst } from "@/features/lokalebooking/regler";
import type { BeslutSvar, Booking } from "@/features/lokalebooking/types";

// Siden, et godkend- eller afvis-link fra notifikationsmailen åbner.
//
// Fælles for begge links, fordi de kun er forskellige i to sætninger og i farven
// på knappen. Alt det, der betyder noget — hvad der vises, når linket er brugt,
// og hvad der vises, når bookingen allerede er behandlet — skal være ens.

type BeslutningSideProps = {
  art: "godkend" | "afvis";
  // Bookingen bag tokenet, eller null hvis tokenet ikke passer på nogen.
  booking: Booking | null;
  handling: (forrige: BeslutSvar, fd: FormData) => Promise<BeslutSvar>;
};

function Ramme({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
          Lokalebooking · VB Parken
        </p>
        {children}
      </div>
    </main>
  );
}

export function BeslutningSide({ art, booking, handling }: BeslutningSideProps) {
  // Ukendt token. Sker, hvis linket er skrevet forkert af, eller hvis bookingen
  // er slettet siden mailen blev sendt. Ingen fejlside: den, der klikker, har
  // ikke gjort noget forkert.
  if (!booking) {
    return (
      <Ramme>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          Linket virker ikke
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Linket hører ikke til nogen booking. Det kan være skrevet forkert af, eller bookingen kan
          være fjernet, siden mailen blev sendt. Alle bookinger står i adminfladen under
          Lokalebooking.
        </p>
      </Ramme>
    );
  }

  const lokale = findLokale(booking.lokale);
  const naar = tidsrumTekst(new Date(booking.start_tid), new Date(booking.slut_tid));

  const oversigt = (
    <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      <dt className="text-slate-500">Lokale</dt>
      <dd className="font-medium text-slate-900">{lokale?.navn ?? booking.lokale}</dd>

      <dt className="text-slate-500">Tidspunkt</dt>
      <dd className="font-medium text-slate-900">{naar}</dd>

      <dt className="text-slate-500">Formål</dt>
      <dd className="font-medium text-slate-900">{booking.formaal}</dd>

      {booking.hold && (
        <>
          <dt className="text-slate-500">Hold</dt>
          <dd className="font-medium text-slate-900">{booking.hold}</dd>
        </>
      )}

      <dt className="text-slate-500">Booket af</dt>
      <dd className="font-medium text-slate-900">
        {booking.navn}
        <br />
        <a className="text-red-700 underline underline-offset-2" href={`mailto:${booking.email}`}>
          {booking.email}
        </a>
        <br />
        <a className="text-red-700 underline underline-offset-2" href={`tel:${booking.mobil}`}>
          {booking.mobil}
        </a>
      </dd>

      {booking.besked && (
        <>
          <dt className="text-slate-500">Besked</dt>
          <dd className="leading-6 text-slate-700">{booking.besked}</dd>
        </>
      )}
    </dl>
  );

  // Allerede behandlet. Det er det normale, når to personer har fået samme mail,
  // eller når linket åbnes igen bagefter — derfor en rolig besked og ikke en fejl.
  if (booking.status !== "afventer") {
    return (
      <Ramme>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            {booking.status === "bekraeftet"
              ? "Bookingen er allerede godkendt"
              : booking.status === "afvist"
                ? "Bookingen er allerede afvist"
                : "Bookingen er aflyst"}
          </h1>
          <StatusMaerke status={booking.status} />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Der er taget stilling til den{" "}
          {booking.besluttet_af === "mail" ? "fra et link i en mail" : "i adminfladen"}, og bookeren
          har fået besked. Du behøver ikke gøre mere.
        </p>
        {oversigt}
        {booking.afvisningsgrund && (
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <span className="font-semibold">Begrundelse:</span> {booking.afvisningsgrund}
          </p>
        )}
      </Ramme>
    );
  }

  return (
    <Ramme>
      <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
        {art === "godkend" ? "Vil du godkende denne booking?" : "Vil du afvise denne booking?"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {art === "godkend"
          ? "Bookeren får en mail om, at tidsrummet er bekræftet."
          : "Bookeren får en mail med din begrundelse, og tidsrummet bliver ledigt igen."}
      </p>

      {oversigt}

      <BeslutningForm art={art} handling={handling} />
    </Ramme>
  );
}
