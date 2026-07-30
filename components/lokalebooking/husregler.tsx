// Klubbens spilleregler for lokalet, vist øverst på bookingsiden.
//
// Teksten står i features/lokalebooking/lokaler.ts sammen med resten af lokalets
// data, ikke her. Den er klubbens indhold og bliver rettet oftere end den kasse,
// den står i.
//
// Vises i begge tilstande, også indlejret. Reglerne er ikke intern information —
// de er henvendt til den, der booker, og det er netop i klubbens iframe, de har
// deres publikum.

export function Husregler({ regler }: { regler: readonly string[] }) {
  if (regler.length === 0) return null;

  return (
    <section
      aria-labelledby="husregler-titel"
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <h2
        id="husregler-titel"
        className="text-xs font-bold uppercase tracking-[0.18em] text-red-700"
      >
        Før du booker
      </h2>
      <ul className="mt-2.5 space-y-1.5">
        {regler.map((regel) => (
          <li key={regel} className="flex gap-2.5 text-sm leading-6 text-slate-700">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-700" />
            <span>{regel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
