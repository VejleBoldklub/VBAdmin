import type { BookingStatus } from "@/features/lokalebooking/types";

// Statusmærket, delt mellem tabellen og godkendelseskøen, så de to aldrig kan
// komme til at vise samme status i to forskellige farver.
//
// Ingen "use client": komponenten er ren visning uden tilstand og kan derfor
// bruges både i en Server Component og inde i en klientkomponent.

const STIL: Record<BookingStatus, { klasse: string; tekst: string }> = {
  bekraeftet: {
    klasse: "bg-slate-700 text-white",
    tekst: "Bekræftet",
  },
  // Rødtonet, fordi det er den ene status, der kræver at nogen gør noget.
  afventer: {
    klasse: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200",
    tekst: "Afventer",
  },
  afvist: {
    klasse: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    tekst: "Afvist",
  },
  aflyst: {
    klasse: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    tekst: "Aflyst",
  },
};

export function StatusMaerke({ status }: { status: BookingStatus }) {
  const stil = STIL[status];

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${stil.klasse}`}
    >
      {stil.tekst}
    </span>
  );
}
