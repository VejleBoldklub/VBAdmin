import Link from "next/link";
import { lokaler } from "@/features/lokalebooking/lokaler";
import type { BookingFilter } from "@/features/lokalebooking/types";

// Filtrene som links, ikke som klientkode.
//
// Hvert valg er en adresse. Det giver en delbar URL, virker uden JavaScript, og
// Next skifter siden uden at genindlæse den. En select med en onChange-handler
// ville kræve en klientkomponent for at gøre præcis det samme.

const BASIS = "/admin/lokalebooking";

type FiltreProps = {
  filter: BookingFilter;
  // Antal viste bookinger, så det kan stå ved filtrene frem for et andet sted.
  antal: number;
  afkortet: boolean;
  maks: number;
};

// Bygger adressen for ét ændret filter og bevarer de øvrige. "alle" udelades, så
// den uændrede visning har den korteste adresse.
function sti(filter: BookingFilter, aendring: Partial<BookingFilter>): string {
  const samlet = { ...filter, ...aendring };
  const params = new URLSearchParams();

  if (samlet.lokale !== "alle") params.set("lokale", samlet.lokale);
  if (samlet.status !== "alle") params.set("status", samlet.status);
  if (samlet.periode !== "kommende") params.set("periode", samlet.periode);

  const forespoergsel = params.toString();
  return forespoergsel === "" ? BASIS : `${BASIS}?${forespoergsel}`;
}

function Gruppe({
  navn,
  valg,
}: {
  navn: string;
  valg: { tekst: string; href: string; aktiv: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{navn}</span>
      {valg.map((v) => (
        <Link
          key={v.tekst}
          href={v.href}
          scroll={false}
          aria-current={v.aktiv ? "true" : undefined}
          className={`rounded-full px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 ${
            v.aktiv
              ? "bg-red-700 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {v.tekst}
        </Link>
      ))}
    </div>
  );
}

export default function Filtre({ filter, antal, afkortet, maks }: FiltreProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <Gruppe
          navn="Lokale"
          valg={[
            { tekst: "Alle", href: sti(filter, { lokale: "alle" }), aktiv: filter.lokale === "alle" },
            ...lokaler.map((l) => ({
              tekst: l.navn,
              href: sti(filter, { lokale: l.slug }),
              aktiv: filter.lokale === l.slug,
            })),
          ]}
        />
        <Gruppe
          navn="Status"
          valg={[
            { tekst: "Alle", href: sti(filter, { status: "alle" }), aktiv: filter.status === "alle" },
            {
              tekst: "Afventer",
              href: sti(filter, { status: "afventer" }),
              aktiv: filter.status === "afventer",
            },
            {
              tekst: "Bekræftet",
              href: sti(filter, { status: "bekraeftet" }),
              aktiv: filter.status === "bekraeftet",
            },
            {
              tekst: "Afvist",
              href: sti(filter, { status: "afvist" }),
              aktiv: filter.status === "afvist",
            },
            {
              tekst: "Aflyst",
              href: sti(filter, { status: "aflyst" }),
              aktiv: filter.status === "aflyst",
            },
          ]}
        />
        <Gruppe
          navn="Periode"
          valg={[
            {
              tekst: "Kommende",
              href: sti(filter, { periode: "kommende" }),
              aktiv: filter.periode === "kommende",
            },
            {
              tekst: "Alle, også afholdte",
              href: sti(filter, { periode: "alle" }),
              aktiv: filter.periode === "alle",
            },
          ]}
        />
      </div>

      <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
        {antal === 1 ? "1 booking" : `${antal} bookinger`}
        {afkortet && (
          <span className="font-semibold text-slate-700">
            {" "}
            — loftet på {maks} rækker er nået. Der findes flere; indsnævr filtrene for at se dem.
          </span>
        )}
      </p>
    </div>
  );
}
