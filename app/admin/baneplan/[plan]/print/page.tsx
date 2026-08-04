import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaaltavleTabel } from "@/components/baneplan/maaltavle";
import { hentKladde } from "@/features/baneplan/actions";
import { findBaneplan } from "@/features/baneplan/plans";
import { tildelingerPaaDag } from "@/features/baneplan/layout";
import { DAGE } from "@/features/baneplan/types";
import DagGitter from "../dag-gitter";
import PrintKnap from "./print-knap";
import "./print.css";

type PrintPageProps = {
  params: Promise<{ plan: string }>;
};

// Kladden læses fra databasen ved hvert kald. Siden er en øjebliksgengivelse af
// noget, der bliver rettet i, mens den bruges, og må ikke kunne komme fra en
// cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Baneplan · kladde til godkendelse",
  robots: { index: false, follow: false },
};

// Printvenlig udgave af kladden, til en PDF der kan sendes rundt til godkendelse,
// før planen publiceres.
//
// Skemaet tegnes med DagGitter — samme komponent som skærmen og den offentlige
// side — så PDF'en viser planen som den ser ud, og ikke en tabel med de samme
// tal i. Hele ugen kommer med, én dag pr. side.
//
// Ruten ligger under /admin og er derfor dækket af adgangskontrollen i proxy.ts.
// En kladde er ikke offentlig, før den er publiceret.
export default async function PrintBaneplanPage({ params }: PrintPageProps) {
  const { plan: slug } = await params;
  const plan = findBaneplan(slug);

  if (!plan) {
    notFound();
  }

  const kladde = await hentKladde(plan.slug);

  if (!kladde) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm leading-6 text-slate-600">
          Der er ingen åben kladde for {plan.name}. Opret en kladde i editoren, før du henter en PDF.
        </p>
      </main>
    );
  }

  const { fields, events, maaltavle } = kladde.data;
  const dato = new Date().toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="bg-white px-4 py-4 text-slate-950 print:px-0 print:py-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            Baneplan · {plan.name}
          </p>
          <h1 className="text-xl font-black leading-tight">
            {kladde.saesontitel || "(ingen sæsontitel angivet)"}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {/* Vigtigt på papir: en udskrift uden dette kunne forveksles med den
                gældende plan, og hele formålet er at få den godkendt først. */}
            <strong className="font-bold uppercase text-amber-700">Kladde</strong> — ikke publiceret.
            Udskrevet {dato}.
          </p>
        </div>
        <PrintKnap />
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-slate-600">Kladden har endnu ingen baner.</p>
      ) : (
        <>
          {DAGE.map((dag) => {
            const antal = tildelingerPaaDag(events, dag).length;
            return (
              <section key={dag} className="print-dag mb-6 print:mb-0">
                <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-700">
                  {dag}
                  {antal === 0 && (
                    <span className="ml-2 font-semibold normal-case text-slate-500">
                      ingen tildelinger
                    </span>
                  )}
                </h2>
                <DagGitter fields={fields} events={events} day={dag} tilPrint />
              </section>
            );
          })}

          {maaltavle && (
            <section className="print-maaltavle">
              <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-700">
                Måloversigt
              </h2>
              <MaaltavleTabel maaltavle={maaltavle} fields={fields} tilPrint />
            </section>
          )}
        </>
      )}
    </main>
  );
}
