import { MIN_FIELD_W, TIME_W } from "@/features/baneplan/layout";
import { maaltavleKolonner } from "@/features/baneplan/maaltavle";
import type { Maaltavle, ScheduleField } from "@/features/baneplan/types";

type MaaltavleTabelProps = {
  maaltavle: Maaltavle;
  fields: ScheduleField[];
};

// Læsende måloversigt til den offentlige baneplan. Viser hvilke måltyper der
// står på hvilke baner.
export function MaaltavleTabel({ maaltavle, fields }: MaaltavleTabelProps) {
  if (maaltavle.raekker.length === 0 || fields.length === 0) return null;

  const baner = fields.map((f) => f.name);

  return (
    <section aria-labelledby="maaltavle-titel" className="mt-3 overflow-x-auto">
      <h2 id="maaltavle-titel" className="sr-only">
        Måloversigt
      </h2>
      {/*
        Kolonnerne skal stå lodret i flugt med skemaets banekolonner ovenover.
        Derfor genbruges TIME_W og MIN_FIELD_W fra samme layout-modul som
        ScheduleView, frem for at tabellen finder sine egne bredder.

        table-layout: fixed er nøglen. Med auto-layout bestemmes bredderne af
        indholdet, så "2 x u/hjul + 1 x m/hjul" gjorde sin kolonne bredere end
        naboens. Med fixed layout deles den resterende plads ligeligt mellem
        kolonner uden angivet bredde — præcis som gitterets repeat(n, 1fr).

        minWidth er sat til samme udtryk som gitterets, så de to også begynder at
        scrolle vandret ved samme skærmbredde.
      */}
      <table
        className="w-full border-collapse text-xs"
        style={{
          tableLayout: "fixed",
          minWidth: TIME_W + baner.length * MIN_FIELD_W,
        }}
      >
        <colgroup>
          {/* Rækkeetiketten flugter med gitterets TID-kolonne. */}
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
                className="break-words border border-slate-200 bg-slate-50 p-2 text-center font-bold uppercase tracking-wide text-slate-600"
              >
                {bane}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {maaltavle.raekker.map((raekke) => (
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
                  // break-words er nødvendig med fast tabellayout: kolonnen kan
                  // ikke længere vokse efter indholdet, så en lang værdi som
                  // "5 x u/hjul + 4 x u/hjul (tunge)" skal ombryde i stedet.
                  className={`break-words border border-slate-200 p-2 text-center ${
                    k.vaerdi === "-" ? "text-slate-400" : "text-slate-800"
                  }`}
                >
                  {k.vaerdi}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
