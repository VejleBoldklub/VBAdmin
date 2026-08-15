"use client";

// Til/fra for om måloversigten vises på den offentlige plan.
//
// Kontakten hører til planen, ikke til tavlens indhold: den kan slås fra, mens
// tavlen redigeres videre, og redigeringen kan fortsætte, mens den er skjult.
// Derfor står den ved siden af editoren og ikke inde i den.
//
// role="switch" frem for et afkrydsningsfelt. En skærmlæser skal kunne høre, at
// det er en tilstand der slås til og fra, ikke et valg der sendes med en
// formular.
export default function MaaltavleSynligKontakt({
  synlig,
  onSkift,
}: {
  synlig: boolean;
  onSkift: (synlig: boolean) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        role="switch"
        aria-checked={synlig}
        onClick={() => onSkift(!synlig)}
        className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
      >
        <span
          aria-hidden="true"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            synlig ? "bg-red-700" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              synlig ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </span>

        <span className="text-sm font-semibold text-slate-950">Vis måltavle offentligt</span>
      </button>

      <span
        className={`text-sm ${synlig ? "text-slate-600" : "font-semibold text-slate-700"}`}
      >
        {synlig
          ? "Vises på den offentlige plan, når kladden publiceres."
          : "Skjult for offentligheden. Du kan stadig redigere den her."}
      </span>
    </div>
  );
}
