"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logUdVedInaktivitet } from "@/app/login/actions";
import { ADVARSEL_MINUTTER, ADVARSEL_MS, INAKTIVITET_MS } from "@/lib/inaktivitet";

// Automatisk logud, når adminfladen står urørt.
//
// Vagten ligger i app/admin/layout.tsx og på forsiden, altså de sider, der
// kræver login. Den må ikke lægges i app/layout.tsx: de offentlige baneplaner,
// lokalebookingen og kioskskærmen ligger under samme rod, og kioskskærmen skal
// netop kunne stå urørt i timevis.
//
// Sessionen ligger i en httpOnly-cookie, som browseren ikke kan læse eller
// rydde. Derfor kalder vagten server-handlingen logUdVedInaktivitet, hvor
// signOut i forvejen sker — samme vej som knappen "Log ud" på forsiden.
//
// Der måles på Date.now() frem for på, hvornår en timer fyrer. En bærbar, der
// har været lukket i en time, fyrer sine timere sent og uforudsigeligt, mens et
// tidsstempel er til at stole på: låget op efter en time giver logud med det
// samme, ikke en time senere.

// Hvor ofte der ses efter, om tiden er gået. Et sekund, fordi nedtællingen i
// advarslen tælles ned i sekunder.
const TIK_MS = 1000;

// Sidste aktivitet deles mellem faner gennem localStorage.
//
// Uden det ville en glemt fane i baggrunden logge brugeren ud midt i arbejdet i
// en anden — logud rydder cookien for hele browseren, ikke kun for den fane, der
// tællede ned.
const NOEGLE = "vbadmin:sidste-aktivitet";

// Hvor ofte tidsstemplet må skrives til localStorage. mousemove fyrer mange
// gange i sekundet, og hver skrivning ses af alle andre faner. Fem sekunders
// upræcished betyder intet mod en grænse på 30 minutter.
const SKRIV_MS = 5000;

const HAENDELSER = ["mousemove", "keydown", "click", "scroll"] as const;

function laesDelt(): number {
  try {
    const raa = window.localStorage.getItem(NOEGLE);
    const tal = raa === null ? Number.NaN : Number(raa);

    return Number.isFinite(tal) ? tal : 0;
  } catch {
    // localStorage kan være slået fra. Så gælder kun fanens egen aktivitet, og
    // vagten virker som før — bare uden at faner ved noget om hinanden.
    return 0;
  }
}

function skrivDelt(tid: number): void {
  try {
    window.localStorage.setItem(NOEGLE, String(tid));
  } catch {
    // Se laesDelt.
  }
}

export function Inaktivitetsvagt() {
  // Sekunder tilbage, når advarslen vises. null betyder ingen advarsel.
  const [tilbage, setTilbage] = useState<number | null>(null);

  const sidsteAktivitet = useRef(0);
  const sidsteSkrivning = useRef(0);

  // Advarslen fryser tællingen: når den først er vist, nulstiller mousemove og
  // de andre ikke længere timeren. Ellers ville advarslen forsvinde i samme
  // øjeblik brugeren rørte musen for at trykke på knappen, og den ville i
  // praksis aldrig kunne læses.
  const advarer = useRef(false);

  // Logud må kun sendes én gang. Uden dette ville hvert tik sende sit eget kald,
  // mens viderestillingen er undervejs.
  const sendt = useRef(false);

  const nulstil = useCallback((nu: number) => {
    sidsteAktivitet.current = nu;
    advarer.current = false;
    setTilbage(null);

    if (nu - sidsteSkrivning.current >= SKRIV_MS) {
      sidsteSkrivning.current = nu;
      skrivDelt(nu);
    }
  }, []);

  // "Bliv logget ind" i advarslen. Skriver med det samme, uden hensyn til
  // SKRIV_MS, så de andre faner ved det nu og ikke om fem sekunder.
  const forbliv = useCallback(() => {
    const nu = Date.now();

    sidsteAktivitet.current = nu;
    sidsteSkrivning.current = nu;
    advarer.current = false;
    setTilbage(null);
    skrivDelt(nu);
  }, []);

  useEffect(() => {
    const start = Date.now();

    // At siden bliver hentet er i sig selv aktivitet, og det er nyere end alt,
    // hvad der kan stå i localStorage. Derfor læses den delte værdi ikke her —
    // den kan kun være ældre. Skrivningen er til de andre faner.
    sidsteAktivitet.current = start;
    sidsteSkrivning.current = start;
    skrivDelt(start);

    const paaAktivitet = () => {
      if (advarer.current) return;

      nulstil(Date.now());
    };

    for (const navn of HAENDELSER) {
      window.addEventListener(navn, paaAktivitet, { passive: true });
    }

    // En anden fane har haft aktivitet. Følger med, også mens advarslen står:
    // trykker brugeren "Bliv logget ind" i én fane, skal de andre også blive.
    const paaLager = (e: StorageEvent) => {
      if (e.key !== NOEGLE) return;

      const delt = laesDelt();

      if (delt > sidsteAktivitet.current) {
        sidsteAktivitet.current = delt;
        advarer.current = false;
        setTilbage(null);
      }
    };

    window.addEventListener("storage", paaLager);

    const tik = window.setInterval(() => {
      if (sendt.current) return;

      const gaaet = Date.now() - sidsteAktivitet.current;

      if (gaaet >= INAKTIVITET_MS) {
        sendt.current = true;

        // Så nedtællingen ikke står stille på et sekund tilbage, mens
        // viderestillingen er undervejs.
        setTilbage(0);

        void logUdVedInaktivitet()
          .then(() => {
            // Sessionen er ryddet på serveren. Beskeden til brugeren er
            // loginsidens ansvar, og der sendes hen med en hel sideindlæsning —
            // se begrundelsen i logUdVedInaktivitet.
            window.location.href = "/login?inaktiv=1";
          })
          .catch((fejl) => {
            // Kaldet nåede ikke frem, fx fordi netværket var væk et øjeblik.
            // Der prøves igen ved næste tik. Alternativet — at sende til
            // loginsiden alligevel — ville sige "du er logget ud" om en session,
            // der stadig er gyldig, og brugeren ville blive sendt tilbage ind.
            console.error("Kunne ikke logge ud ved inaktivitet:", fejl);
            sendt.current = false;
          });

        return;
      }

      if (gaaet >= ADVARSEL_MS) {
        advarer.current = true;
        setTilbage(Math.ceil((INAKTIVITET_MS - gaaet) / 1000));
      }
    }, TIK_MS);

    return () => {
      for (const navn of HAENDELSER) {
        window.removeEventListener(navn, paaAktivitet);
      }

      window.removeEventListener("storage", paaLager);
      window.clearInterval(tik);
    };
  }, [nulstil]);

  if (tilbage === null) return null;

  return <Advarsel tilbage={tilbage} onForbliv={forbliv} />;
}

function Advarsel({ tilbage, onForbliv }: { tilbage: number; onForbliv: () => void }) {
  const knap = useRef<HTMLButtonElement>(null);

  // Fokus flyttes til knappen, så advarslen kan besvares med tastaturet uden
  // først at skulle tabbe gennem siden bagved.
  useEffect(() => {
    knap.current?.focus();
  }, []);

  // Escape betyder "bliv logget ind", ikke "log mig ud". Den utilsigtede tryk
  // skal være den harmløse.
  useEffect(() => {
    const paaTast = (e: KeyboardEvent) => {
      if (e.key === "Escape") onForbliv();
    };

    window.addEventListener("keydown", paaTast);

    return () => window.removeEventListener("keydown", paaTast);
  }, [onForbliv]);

  const minutter = Math.floor(tilbage / 60);
  const sekunder = tilbage % 60;
  const nedtaelling = `${minutter}:${String(sekunder).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="inaktiv-titel"
        aria-describedby="inaktiv-tekst"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Inaktivitet</p>

        <h2
          id="inaktiv-titel"
          className="mt-2 text-lg font-bold tracking-tight text-slate-950 sm:text-xl"
        >
          Du bliver snart logget ud
        </h2>

        <p id="inaktiv-tekst" className="mt-2 text-sm leading-6 text-slate-600">
          Der er ikke sket noget på siden i {ADVARSEL_MINUTTER} minutter. Om{" "}
          {/* aria-live, så en skærmlæser læser nedtællingen med, i stedet for at
              den kun ændrer sig visuelt. */}
          <span aria-live="polite" className="font-bold tabular-nums text-slate-950">
            {nedtaelling}
          </span>{" "}
          bliver du logget ud af sikkerhedsmæssige grunde.
        </p>

        <button
          ref={knap}
          type="button"
          onClick={onForbliv}
          className="mt-5 w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          Bliv logget ind
        </button>
      </div>
    </div>
  );
}
