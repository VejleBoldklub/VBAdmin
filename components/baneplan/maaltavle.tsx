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
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className="w-28 border border-slate-200 bg-slate-50 p-2" />
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
                  className={`border border-slate-200 p-2 text-center ${
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
