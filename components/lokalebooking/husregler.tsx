// Klubbens spilleregler for lokalet, vist øverst på bookingsiden.
//
// Teksten står i features/lokalebooking/lokaler.ts sammen med resten af lokalets
// data, ikke her. Den er klubbens indhold og bliver rettet oftere end den kasse,
// den står i.
//
// Vises i begge tilstande, også indlejret. Reglerne er ikke intern information —
// de er henvendt til den, der booker, og det er netop i klubbens iframe, de har
// deres publikum.

// En regel kan henvise til en mailadresse. Den gøres klikbar: en adresse, der
// skal skrives af i hånden fra en telefon i en iframe, bliver ikke brugt.
//
// Mønsteret har med vilje ikke /g. En global regex husker sin position mellem
// kald, og det samme udtryk bruges både til at dele teksten op og til at afgøre,
// om en del er en adresse — med /g ville hvert andet tjek fejle. Domænedelen kan
// ikke ende på et punktum, så et punktum efter adressen bliver stående i teksten
// og ikke en del af linket.
const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

function medMailLinks(tekst: string) {
  return tekst.split(EMAIL).map((del, i) =>
    EMAIL.test(del) ? (
      <a
        key={i}
        href={`mailto:${del}`}
        className="font-medium text-red-700 underline underline-offset-2"
      >
        {del}
      </a>
    ) : (
      del
    )
  );
}

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
            <span>{medMailLinks(regel)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
