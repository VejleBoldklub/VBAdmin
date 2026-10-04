"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { DagBooking } from "@/features/lokalebooking/gitter";
import { AFLYSNINGSGRUND_MAKS, type AflysResultat } from "@/features/lokalebooking/formular";
import { minutterTilKlokke } from "@/features/lokalebooking/regler";
import { dagNavn, dagTal } from "@/features/lokalebooking/uge";

// Bookerens egen annullering af en booking, åbnet ved et klik på den i kalenderen.
//
// Dialogen ejer sin egen handlingstilstand og monteres på ny, hver gang en booking
// åbnes (panelet giver den en ny key). Så starter den altid tom, uden et svar fra
// sidste gang — useActionState har ingen nulstilling.
//
// Mailadressen er beviset på, at det er ens egen booking; den står ikke i
// kalenderen. Se features/lokalebooking/egen-aflysning.ts.

type AflysDialogProps = {
  booking: DagBooking;
  lokaleNavn: string;
  kraeverGrund: boolean;
  handling: (forrige: AflysResultat, fd: FormData) => Promise<AflysResultat>;
  luk: () => void;
};

const FELT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700";
const MAERKAT = "block text-sm font-semibold text-slate-800";

export default function AflysDialog({
  booking,
  lokaleNavn,
  kraeverGrund,
  handling,
  luk,
}: AflysDialogProps) {
  const [resultat, formAction, venter] = useActionState<AflysResultat, FormData>(handling, {
    tilstand: "uroert",
  });

  // Styrede felter, så indtastningen bliver stående, hvis serveren siger nej —
  // React nulstiller ellers formularen, når en server action er kørt.
  const [email, setEmail] = useState("");
  const [grund, setGrund] = useState("");

  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const lukHvisMuligt = () => {
    if (venter) return;
    dialog.current?.close();
    luk();
  };

  const naar = `${dagNavn(booking.dato)} ${dagTal(booking.dato)} kl. ${minutterTilKlokke(
    booking.fra
  )}–${minutterTilKlokke(booking.til)}`;

  return (
    <dialog
      ref={dialog}
      // Placeringen er den samme som bookingdialogens — se booking-panel.tsx for
      // hvorfor den er bundet til toppen frem for centreret.
      className="fixed inset-x-0 top-4 mx-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-950/40"
      onClick={(e) => {
        if (e.target === dialog.current) lukHvisMuligt();
      }}
      onCancel={(e) => {
        e.preventDefault();
        lukHvisMuligt();
      }}
    >
      {resultat.tilstand === "ok" ? (
        <div className="bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Annulleret</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            Bookingen er annulleret
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {resultat.lokaleNavn}, {resultat.naar}.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tidsrummet er givet fri igen, og du får en bekræftelse på mail.
            {kraeverGrund && " Cafeteriet har fået besked med din begrundelse."}
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={lukHvisMuligt}
              className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              Luk
            </button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-bold tracking-tight text-slate-950">Annullér booking</h3>
            <button
              type="button"
              onClick={lukHvisMuligt}
              disabled={venter}
              aria-label="Luk"
              className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <dl className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <div>
              <dt className="sr-only">Lokale og tidspunkt</dt>
              <dd className="font-semibold text-slate-950">
                {lokaleNavn}, {naar}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Formål</dt>
              <dd>{booking.hold ? `${booking.formaal} · ${booking.hold}` : booking.formaal}</dd>
            </div>
            <div>
              <dt className="sr-only">Booket af</dt>
              <dd>Booket af {booking.navn}</dd>
            </div>
          </dl>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Kun den, der har booket, kan annullere. Bekræft med den e-mailadresse, bookingen blev
            lavet med.
          </p>

          {resultat.tilstand === "fejl" && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {resultat.fejl}
            </p>
          )}

          <input type="hidden" name="id" value={booking.id} />

          <div className="mt-4 space-y-4">
            <div>
              <label className={MAERKAT} htmlFor="aflys-email">
                E-mail
              </label>
              <input
                id="aflys-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1.5 ${FELT}`}
              />
            </div>

            {kraeverGrund && (
              <div>
                <label className={MAERKAT} htmlFor="aflys-grund">
                  Begrundelse
                </label>
                <textarea
                  id="aflys-grund"
                  name="grund"
                  rows={3}
                  required
                  maxLength={AFLYSNINGSGRUND_MAKS}
                  value={grund}
                  onChange={(e) => setGrund(e.target.value)}
                  placeholder="Fx træningen er flyttet, eller arrangementet er aflyst"
                  className={`mt-1.5 ${FELT}`}
                />
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Begrundelsen sendes til cafeteriet.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={venter}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {venter ? "Annullerer …" : "Annullér booking"}
            </button>
            <button
              type="button"
              onClick={lukHvisMuligt}
              disabled={venter}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-60"
            >
              Fortryd
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
