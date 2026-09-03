"use client";

import { useState, useTransition } from "react";
import { StatusMaerke } from "@/components/lokalebooking/status-maerke";
import { afvisBooking, godkendBooking } from "@/features/lokalebooking/admin-handlinger";
import { findLokale } from "@/features/lokalebooking/lokaler";
import type { Booking } from "@/features/lokalebooking/types";
import AnnullerKnap from "./annuller-knap";

// Ét kort pr. cafeteria-booking, der venter på en beslutning.
//
// Kortet har sin egen tilstand frem for at ligge i en fælles liste. Det er det,
// der gør, at en fejl på én booking — fx at en anden lige har godkendt den — kun
// vises på den, og at de øvrige kort bliver stående som de var.

type AfventerKortProps = {
  booking: Booking;
  dag: string;
  klokke: string;
  // Sandt, hvis tidsrummet er passeret. En beslutning er stadig mulig, men skal
  // markeres: at godkende en booking, der er overstået, er sjældent meningen.
  erPasseret: boolean;
};

const KNAP =
  "rounded-lg px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export default function AfventerKort({ booking, dag, klokke, erPasseret }: AfventerKortProps) {
  const [venter, startOvergang] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [viserAfvis, setViserAfvis] = useState(false);
  const [grund, setGrund] = useState("");

  // Handlingerne kaldes i en overgang, så knapperne kan slås fra, mens svaret er
  // undervejs, og siden kan gengives igen bagefter uden at kortet forsvinder
  // under fingeren.
  const godkend = () =>
    startOvergang(async () => {
      setFejl(null);
      const svar = await godkendBooking(booking.id);
      if (!svar.ok) setFejl(svar.fejl);
      // Ved held siger vi ingenting: revalideringen fjerner kortet fra køen, og
      // bookingen står nu som bekræftet i listen nedenfor.
    });

  const afvis = () =>
    startOvergang(async () => {
      setFejl(null);
      const svar = await afvisBooking(booking.id, grund);
      if (!svar.ok) {
        setFejl(svar.fejl);
        return;
      }
      setGrund("");
      setViserAfvis(false);
    });

  return (
    <article className="rounded-xl border border-red-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-950">
            {dag} · {klokke}
          </p>
          <p className="mt-0.5 text-sm text-slate-700">{booking.formaal}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {erPasseret && (
            <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-slate-200">
              Tidsrummet er passeret
            </span>
          )}
          <StatusMaerke status={booking.status} />
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-slate-500">Booker:</dt>
          <dd className="font-medium text-slate-900">{booking.navn}</dd>
        </div>
        {booking.hold && (
          <div className="flex gap-2">
            <dt className="text-slate-500">Hold:</dt>
            <dd className="font-medium text-slate-900">{booking.hold}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-slate-500">E-mail:</dt>
          <dd>
            <a className="text-red-700 underline underline-offset-2" href={`mailto:${booking.email}`}>
              {booking.email}
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-500">Mobil:</dt>
          <dd>
            <a className="text-red-700 underline underline-offset-2" href={`tel:${booking.mobil}`}>
              {booking.mobil}
            </a>
          </dd>
        </div>
      </dl>

      {booking.besked && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
          {booking.besked}
        </p>
      )}

      {fejl && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {fejl}
        </p>
      )}

      {viserAfvis ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <label className="block text-sm font-semibold text-slate-800" htmlFor={`grund-${booking.id}`}>
            Begrundelse for afvisning
            <span className="ml-1.5 text-xs font-normal text-slate-500">valgfrit</span>
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Skriver du noget, kommer det med i afslagsmailen til bookeren — skriv det derfor, som
            det skal læses. Lader du feltet stå tomt, får bookeren den almindelige afslagsmail
            uden en begrundelse.
          </p>
          <textarea
            id={`grund-${booking.id}`}
            rows={2}
            maxLength={500}
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            placeholder="Fx: Cafeteriet er reserveret til kampdag."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={afvis}
              disabled={venter}
              className={`${KNAP} bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-800`}
            >
              {venter ? "Afviser …" : "Bekræft afvisning"}
            </button>
            <button
              type="button"
              onClick={() => {
                setViserAfvis(false);
                setFejl(null);
              }}
              disabled={venter}
              className={`${KNAP} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-red-700`}
            >
              Fortryd
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={godkend}
            disabled={venter}
            className={`${KNAP} bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700`}
          >
            {venter ? "Arbejder …" : "Godkend"}
          </button>
          <button
            type="button"
            onClick={() => setViserAfvis(true)}
            disabled={venter}
            className={`${KNAP} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-red-700`}
          >
            Afvis …
          </button>
          {/* Annullering er ikke det samme som en afvisning, og de to skal kunne
              skelnes i listen bagefter: en afvist forespørgsel blev aldrig til
              noget, en annulleret booking tog klubben tilbage. Knappen står med
              her, fordi en booking i køen også kan blive overflødig, uden at det
              er et afslag — fx hvis bookeren selv ringer og melder afbud. */}
          <AnnullerKnap
            id={booking.id}
            lokaleNavn={findLokale(booking.lokale)?.navn ?? booking.lokale}
            dag={dag}
            klokke={klokke}
          />
        </div>
      )}
    </article>
  );
}
