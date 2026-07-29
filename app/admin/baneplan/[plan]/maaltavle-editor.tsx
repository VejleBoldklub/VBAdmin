"use client";

import { MIN_FIELD_W, TIME_W } from "@/features/baneplan/layout";
import { maaltavleKolonner, saetMaaltavleVaerdi } from "@/features/baneplan/maaltavle";
import type { Maaltavle, ScheduleField } from "@/features/baneplan/types";

type MaaltavleEditorProps = {
  maaltavle: Maaltavle | undefined;
  fields: ScheduleField[];
  onChange: (maaltavle: Maaltavle) => void;
};

// Simpel formular til måloversigten. Bevidst ikke en del af drag-and-drop-
// editoren: tavlen beskriver parkens inventar og ændres sjældent, så et felt pr.
// celle er rigeligt.
//
// Sammenlægningen fra den oprindelige tavle bevares. En celle, der dækker to
// baner, redigeres som ét felt over to kolonner — strukturen kan altså ikke
// ændres her, kun værdierne.
export default function MaaltavleEditor({ maaltavle, fields, onChange }: MaaltavleEditorProps) {
  if (!maaltavle) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        Denne plan har ingen måloversigt. Vinterplanen skal ikke have en, fordi alle mål er samlet
        på to baner. Skal der lægges en ind, sker det med et SQL-script, da måltyperne ikke kan
        opfindes her.
      </p>
    );
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Opret mindst én bane, før måloversigten kan udfyldes.
      </p>
    );
  }

  const baner = fields.map((f) => f.name);

  return (
    <div className="overflow-x-auto">
      {/*
        Samme kolonnegeometri som den offentlige måltavle og som skemaets
        banekolonner — se components/baneplan/maaltavle.tsx. Uden det ville
        formularen vise en anden kolonnefordeling end resultatet.
      */}
      <table
        className="w-full border-collapse text-xs"
        style={{
          tableLayout: "fixed",
          minWidth: TIME_W + baner.length * MIN_FIELD_W,
        }}
      >
        <colgroup>
          <col style={{ width: TIME_W }} />
          {baner.map((bane) => (
            <col key={bane} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="border border-slate-200 bg-slate-50 p-2" />
            {baner.map((bane) => (
              <th
                key={bane}
                scope="col"
                className="border border-slate-200 bg-slate-50 p-2 text-center font-bold uppercase tracking-wide text-slate-600"
              >
                {bane}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {maaltavle.raekker.map((raekke, raekkeIndex) => (
            <tr key={raekke.type}>
              <th
                scope="row"
                className="border border-slate-200 bg-slate-100 p-2 text-left font-bold uppercase tracking-wide text-slate-700"
              >
                {raekke.type}
              </th>
              {maaltavleKolonner(raekke, baner).map((k, i) => (
                <td
                  key={i}
                  colSpan={k.span > 1 ? k.span : undefined}
                  className="border border-slate-200 p-1"
                >
                  {k.celleIndex === null ? (
                    // Banen dækkes ikke af nogen celle. Der er ikke noget at
                    // redigere, og der opfindes ikke en celle for den her.
                    <span className="block text-center text-slate-400" title="Ingen værdi i måloversigten for denne bane">
                      -
                    </span>
                  ) : (
                    <input
                      value={k.vaerdi}
                      onChange={(e) =>
                        onChange(
                          saetMaaltavleVaerdi(maaltavle, raekkeIndex, k.celleIndex as number, e.target.value)
                        )
                      }
                      aria-label={`${raekke.type} på ${k.baner.join(" og ")}`}
                      placeholder="-"
                      className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-center hover:border-slate-200 focus-visible:border-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-700"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
