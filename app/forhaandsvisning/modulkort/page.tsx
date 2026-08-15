// MIDLERTIDIG forhåndsvisning til at vælge dæmpning af låste modulkort.
//
// Ruten ligger uden for matcheren i proxy.ts, så den kan åbnes i et
// Vercel-preview uden login. Den slettes igen, når varianten er valgt — den
// hører ikke hjemme i produktion.
export const metadata = { title: "Forhåndsvisning · modulkort" };

const LAAS = (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
    <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
  </svg>
);

type Stil = {
  kort: string;
  chip: string;
  badge: string;
  titel: string;
  tekst: string;
  kunIkon?: boolean;
};

function AktivtKort({ nr, titel, tekst }: { nr: string; titel: string; tekst: string }) {
  return (
    <div className="flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-xs font-black text-red-700 ring-1 ring-red-100">
          {nr}
        </span>
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 ring-1 ring-inset ring-red-100">
          Aktiv
        </span>
      </div>
      <div className="mt-auto pt-6">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">{titel}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-600">{tekst}</p>
      </div>
    </div>
  );
}

function LaastKort({ nr, titel, tekst, stil }: { nr: string; titel: string; tekst: string; stil: Stil }) {
  return (
    <div className={`flex min-h-40 flex-col rounded-2xl p-5 ${stil.kort}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${stil.chip}`}>
          {nr}
        </span>
        <span className={stil.badge}>
          {LAAS}
          {!stil.kunIkon && "Ingen adgang"}
        </span>
      </div>
      <div className="mt-auto pt-6">
        <h3 className={`text-lg font-bold tracking-tight ${stil.titel}`}>{titel}</h3>
        <p className={`mt-1.5 max-w-sm text-sm leading-6 ${stil.tekst}`}>{tekst}</p>
      </div>
    </div>
  );
}

const VARIANTER: { navn: string; note: string; stil: Stil }[] = [
  {
    navn: "NU — nuværende",
    note: "Kortet er slate-100 på en slate-50-side, altså mørkere end siden. Det er derfor det stikker ud.",
    stil: {
      kort: "border border-slate-200 bg-slate-100",
      chip: "bg-slate-200 text-slate-500 ring-1 ring-slate-300",
      badge:
        "flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-300",
      titel: "text-slate-500",
      tekst: "text-slate-500",
    },
  },
  {
    navn: "B — Kontur",
    note: "Stiplet kant, ingen udfyldning, badge uden chip. Ordene bevaret.",
    stil: {
      kort: "border-2 border-dashed border-slate-300 bg-transparent",
      chip: "bg-transparent text-slate-400 ring-1 ring-slate-200",
      badge: "flex items-center gap-1.5 text-[11px] font-semibold text-slate-500",
      titel: "text-slate-500",
      tekst: "text-slate-500",
    },
  },
  {
    navn: "C — Næsten væk",
    note: "Kant næsten usynlig, kun hængelåsen. Roligst, men betydningen skal gættes ud fra ikonet.",
    stil: {
      kort: "border border-slate-100 bg-slate-50",
      chip: "bg-slate-100 text-slate-400",
      badge: "flex items-center gap-1.5 text-slate-400",
      titel: "text-slate-500",
      tekst: "text-slate-500",
      kunIkon: true,
    },
  },
];

export default function Forhaandsvisning() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Dæmpning af låste modulkort</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Hver sektion viser forsidens gitter, som Helene ville se det: to moduler hun har adgang til, og to hun ikke har. Sammenlign hvor hurtigt du kan skelne dem ved ét blik.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Teksten er <strong>slate-500</strong> i alle varianter. Lysere falder under WCAG 4.5:1 mod
          sidens baggrund, så dæmpningen ligger i fladerne frem for i skriften.
        </p>

        {VARIANTER.map((v) => (
          <section key={v.navn} className="mt-10">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">{v.navn}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{v.note}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AktivtKort nr="01" titel="Baneplan" tekst="Administrér klubbens baneplaner." />
              <LaastKort
                nr="02"
                titel="Lokalebooking"
                tekst="Se og godkend bookinger af mødelokalet og cafeteriet."
                stil={v.stil}
              />
              <AktivtKort
                nr="03"
                titel="Infoskærm Cafeteria"
                tekst="Sæt farve og besked på cafeteriets infoskærm."
              />
              <LaastKort
                nr="04"
                titel="Administration"
                tekst="Administrér brugere, roller og systemindstillinger."
                stil={v.stil}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
