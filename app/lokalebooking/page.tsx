import type { Metadata } from "next";
import Link from "next/link";
import { lokaler } from "@/features/lokalebooking/lokaler";

// Oversigt over de bookbare lokaler.
//
// I klubbens iframe peges der direkte på det enkelte lokale, så denne side er
// først og fremmest en indgang for os selv og et sted at komme videre fra, hvis
// nogen deler linket uden lokale.
export const metadata: Metadata = {
  title: "Lokalebooking · Vejle Boldklub",
  robots: { index: false, follow: false },
};

export default function LokalebookingForside() {
  return (
    <main className="min-h-screen bg-white px-3 py-4 text-slate-950 sm:px-5 sm:py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          Lokalebooking
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Vælg det lokale, du vil booke. Åbent kl. 14.00–22.00 på hverdage og kl. 09.00–22.00 i
          weekenden.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {lokaler.map((lokale) => (
            <Link
              key={lokale.slug}
              href={lokale.publicPath}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                {lokale.kraeverGodkendelse ? "Kræver godkendelse" : "Bookes straks"}
              </span>
              <span className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                {lokale.navn}
              </span>
              <span className="mt-1.5 text-sm leading-6 text-slate-600">{lokale.beskrivelse}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
