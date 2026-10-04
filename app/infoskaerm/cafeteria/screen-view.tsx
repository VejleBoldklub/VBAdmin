'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DAY_CONTENT, type DagFarve, type DagIndhold } from '@/lib/infoskaerm/content';
import {
  erOpsaetning,
  erSkaermBillede,
  type Opsaetning,
  type SkaermBillede,
} from '@/lib/infoskaerm/billeder';
import { LAERRED_B, LAERRED_H, rensDesign, type Design } from '@/lib/infoskaerm/design';
import { DesignLaerred, useSkala } from '@/components/infoskaerm/design-laerred';

// Enten er der en plan for dagen, eller også er der ikke.
//
// En union frem for felter, der kan være null: uden en farve findes hverken
// navn eller indhold, og en type, der lod dem stå tomme, ville invitere til at
// tegne et halvt kort. Rækken i databasen kræver en farve, så en dag uden
// farve har heller ingen besked.
//
// Billederne og opsætningen ligger uden for unionen: de findes, hvad enten der
// er valgt en farve for dagen eller ej.
export type ScreenData = (
  | {
      harPlan: true;
      farve: DagFarve;
      navn: string;
      ekstraBesked: string;
      content: DagIndhold;
      // Dagens farves design fra editoren, hvis et er slået til. Ellers
      // tegnes kostkortene.
      design: Design | null;
    }
  | { harPlan: false }
) & {
  billeder: SkaermBillede[];
  opsaetning: Opsaetning;
  // Begyndelsen af adressen på billeder i Storage. Se billedBase().
  billedBase: string;
};

const POLL_INTERVAL_MS = 120_000; // 2 min, samme som den gamle Apps Script-løsning

// Hvor langt skriften må skrues ned, før skærmbilledet i stedet får lov at
// vokse ud over vinduet. Under det her er teksten alligevel ikke læselig på
// afstand i et cafeteria, og så er et rullepanel i et browservindue den ærligere
// udgang end en tekst, ingen kan læse.
const MIN_SKALA = 0.5;
const SKALA_TRIN = 0.04;

// Alle størrelser ganges med --skala, som sættes af tilpasningen nedenfor.
function skaleret(vaerdi: string): string {
  return `calc((${vaerdi}) * var(--skala, 1))`;
}

// Svaret fra /api/infoskaerm/today er ukendte data, indtil det er kontrolleret.
// Skærmen står uden opsyn i cafeteriet, så et uventet svar må ikke kunne
// erstatte en gyldig visning med et halvt tegnet skærmbillede.
function erSkaermData(vaerdi: unknown): vaerdi is ScreenData & { ok: true } {
  if (typeof vaerdi !== 'object' || vaerdi === null) return false;

  const v = vaerdi as Record<string, unknown>;

  if (v.ok !== true) return false;

  if (!erOpsaetning(v.opsaetning)) return false;
  if (typeof v.billedBase !== 'string') return false;
  if (!Array.isArray(v.billeder) || !v.billeder.every(erSkaermBillede)) return false;

  // Ingen plan er et gyldigt svar, ikke en fejl. Det er netop det, skærmen skal
  // kunne vise frem for at gætte på en farve.
  if (v.harPlan === false) return true;

  return (
    v.harPlan === true &&
    typeof v.farve === 'string' &&
    v.farve in DAY_CONTENT &&
    typeof v.navn === 'string' &&
    typeof v.ekstraBesked === 'string' &&
    typeof v.content === 'object' &&
    v.content !== null &&
    (v.design === null || rensDesign(v.design) !== null)
  );
}

export default function ScreenView({ initial }: { initial: ScreenData }) {
  const [data, setData] = useState<ScreenData>(initial);
  const rodRef = useRef<HTMLDivElement>(null);

  // Tælleren findes kun for at få tilpasningen til at køre igen. Værdien
  // bruges ikke — det er ændringen, der er signalet.
  const [maaling, setMaaling] = useState(0);

  // Tæller op hver gang, der skal skiftes billede. Hvilket billede, der vises,
  // regnes ud med modulo, så en liste, der bliver kortere ved næste opdatering,
  // ikke kan pege ud over enden.
  const [trin, setTrin] = useState(0);
  const sekunder = data.opsaetning.sekunder;

  // Rammen om et design og den skala, lærredet på 1920 × 1080 skal tegnes i
  // for at fylde den.
  const [designRamme, setDesignRamme] = useState<HTMLDivElement | null>(null);
  const designSkala = useSkala(designRamme);

  useEffect(() => {
    const id = setInterval(() => setTrin((n) => n + 1), sekunder * 1000);
    return () => clearInterval(id);
  }, [sekunder]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/infoskaerm/today', { cache: 'no-store' });
        if (!res.ok) throw new Error('Status ' + res.status);

        const json: unknown = await res.json();
        if (!cancelled && erSkaermData(json)) {
          setData(json);
        }
      } catch (err) {
        // Vigtigt: hold den SIDST kendte gode visning på skærmen ved fejl
        // (netværksudfald må ikke give en hvid/fejl-skærm som den gamle løsning).
        console.error('Infoskærm opdatering fejlede, beholder nuværende visning:', err);
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Skru skriften ned, indtil skærmbilledet er inde i vinduet.
  //
  // Ren CSS kan ikke klare det. Hvor meget plads en blok fylder afhænger af,
  // hvor teksten ombrydes, og det afhænger igen af kolonnebredden, som skifter
  // med antallet af kort — tre om dagen, fire når der er en besked. En fast
  // formel i vh skulle derfor regnes efter det værste tilfælde og ville gøre
  // teksten unødigt lille alle de øvrige dage.
  //
  // useLayoutEffect, ikke useEffect: målingen og rettelsen skal ske, før
  // billedet tegnes, ellers ses et glimt af den for store tekst.
  useLayoutEffect(() => {
    const rod = rodRef.current;
    if (!rod) return;

    let skala = 1;
    rod.style.setProperty('--skala', '1');

    // Løkken er begrænset af MIN_SKALA og kan derfor højst køre et dusin gange.
    // Math.max holder det sidste trin på gulvet frem for at skyde under det.
    while (skala > MIN_SKALA && rod.scrollHeight > window.innerHeight) {
      skala = Math.max(MIN_SKALA, Math.round((skala - SKALA_TRIN) * 100) / 100);
      rod.style.setProperty('--skala', String(skala));
    }
  }, [data, maaling]);

  useEffect(() => {
    let raf = 0;
    const maalIgen = () => {
      // Kioskens vindue ændrer sig sjældent, men et browservindue trækkes i.
      // Målingen samles i én pr. billede frem for én pr. resize-hændelse.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMaaling((n) => n + 1));
    };

    window.addEventListener('resize', maalIgen);

    // Roboto indlæses med font-display: swap. Skiftes skrifttypen efter første
    // måling, ændrer linjerne længde, og tilpasningen skal regnes om.
    document.fonts?.ready.then(maalIgen).catch(() => {});

    return () => {
      window.removeEventListener('resize', maalIgen);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Roboto er projektets skrifttype, jf. SYSTEM.md §10. Leverancen bad om
  // Quicksand, som ikke er indlæst nogen steder i appen og derfor i praksis
  // ville være blevet til Arial.
  const skaermStil = {
    fontFamily: 'var(--font-roboto), Arial, sans-serif',
    background: '#F4F6FB',
    '--skala': 1,
  } as React.CSSProperties;

  const { billeder } = data;
  const harBilleder = billeder.length > 0;

  // Hvilken opsætning, der rent faktisk bruges.
  //
  // Uden billeder er der intet at vise ved siden af eller skifte til, og
  // skærmen ser ud som før. Uden en kostplan for dagen er der ingen kort at
  // stille billederne ved siden af — så skifter skærmen i stedet mellem
  // beskeden om den manglende plan og billederne, frem for at skjule dem.
  //
  // Det samme gælder et design fra editoren: det er hele skærmen, og der er
  // ingen kolonne at stille billederne i. Vil man have billeder ved siden af et
  // design, lægger man dem ind i designet.
  const design = data.harPlan ? data.design : null;
  const layout = !harBilleder
    ? 'kost'
    : (!data.harPlan || design) && data.opsaetning.layout === 'side'
      ? 'skift'
      : data.opsaetning.layout;

  // I skift er kostplanen trin 0 og billederne de følgende.
  const skiftTrin = trin % (billeder.length + 1);
  const sideBillede = harBilleder ? trin % billeder.length : 0;

  // Billederne i fuld skærm lægges oven på kostplanen frem for at erstatte den.
  // Kostplanen bliver dermed stående i siden, og tilpasningen af skriften
  // ovenfor måler den, som den altid har gjort — også mens et billede vises.
  // Alle billeder er tegnet hele tiden og skiftes med opacity, så kiosken har
  // hentet dem i forvejen og ikke viser et halvt indlæst billede.
  const fuldSkaerm =
    layout === 'skift' ? (
      <div
        aria-hidden={skiftTrin === 0}
        className="fixed inset-0 bg-black transition-opacity duration-700"
        style={{ opacity: skiftTrin === 0 ? 0 : 1 }}
      >
        {billeder.map((b, i) => (
          <BilledLag key={b.id} billede={b} synlig={skiftTrin === i + 1} fuldSkaerm />
        ))}
      </div>
    ) : null;

  // Ingen farve sat for dagen.
  //
  // Skærmen viser bevidst IKKE et af de tre kostkort. Et kort ville se ud som
  // dagens plan, og så ville en glemt indtastning være usynlig — hverken
  // køkkenet eller spillerne kunne se forskel på "i dag er grøn" og "ingen har
  // taget stilling".
  //
  // Det skal samtidig ikke ligne en fejl. Derfor logo, rolig baggrund og en
  // sætning på begge sprog, som resten af skærmen bruger.
  if (!data.harPlan) {
    return (
      <div
        ref={rodRef}
        className="min-h-screen w-full flex flex-col items-center justify-center gap-[4vh] px-[6vw]"
        style={skaermStil}
      >
        <Image
          src="/vb-logo.png"
          alt="Vejle Boldklub"
          width={500}
          height={500}
          priority
          className="w-auto object-contain"
          style={{ height: skaleret('clamp(140px, 12vw, 340px)') }}
        />

        <div className="text-center">
          <p
            className="font-black leading-[1.15] text-slate-700"
            style={{ fontSize: skaleret('clamp(48px, 4vw, 130px)') }}
          >
            Ingen kostplan valgt for i dag
          </p>
          <p
            className="mt-[2vh] font-bold leading-[1.2] text-slate-500"
            style={{ fontSize: skaleret('clamp(30px, 2.4vw, 78px)') }}
          >
            No meal plan selected for today
          </p>
        </div>

        {fuldSkaerm}
      </div>
    );
  }

  // Et design fra editoren.
  //
  // Roden er præcis skærmens højde, så tilpasningen af skriften ovenfor ikke
  // finder noget at skrue ned for. Lærredet skaleres som helhed i stedet.
  if (design) {
    return (
      <div
        ref={(el) => {
          rodRef.current = el;
          setDesignRamme(el);
        }}
        className="flex h-screen w-full items-center justify-center overflow-hidden"
        style={{ background: design.baggrund }}
      >
        {designSkala > 0 && (
          <div
            className="overflow-hidden"
            style={{ width: LAERRED_B * designSkala, height: LAERRED_H * designSkala }}
          >
            <DesignLaerred
              design={design}
              billedBase={data.billedBase}
              besked={data.ekstraBesked}
              skala={designSkala}
            />
          </div>
        )}

        {fuldSkaerm}
      </div>
    );
  }

  const c = data.content;

  // Kortets ramme. Ingen overflow-hidden og ingen min-h-0: begge dele fik
  // kortet til at klippe sit eget indhold i stedet for at vokse.
  const kortKlasse =
    'bg-white rounded-[32px] border border-gray-200 flex flex-col gap-[1.25vh] p-[1.8vh_1.65vw_2.1vh_1.65vw]';

  const overskriftStil = {
    color: c.color,
    fontSize: skaleret('clamp(52px, 3.1vw, 110px)'),
    minHeight: skaleret('clamp(100px, 6.4vw, 220px)'),
  };

  const maerkatStil = {
    background: c.lightColor,
    border: `2px solid ${c.color}`,
    fontSize: skaleret('clamp(26px, 1.45vw, 50px)'),
  };

  const tekstStil = { fontSize: skaleret('clamp(42px, 2.15vw, 78px)') };

  return (
    <div ref={rodRef} className="min-h-screen w-full flex flex-col" style={skaermStil}>
      <header
        className="flex items-center justify-between px-[3vw] py-[2.2vh]"
        style={{
          // minHeight, ikke height: en lang sæsonundertekst skal kunne skubbe
          // headeren større i stedet for at blive skåret af.
          minHeight: skaleret('max(16vh, 145px)'),
          background: c.color,
          color: c.headerTextColor,
        }}
      >
        <div>
          <div
            className="font-black leading-[0.95]"
            style={{ fontSize: skaleret('clamp(82px, 4.8vw, 165px)') }}
          >
            {c.title}
          </div>
          <div
            className="font-extrabold mt-[0.8vh]"
            style={{ fontSize: skaleret('clamp(34px, 2vw, 68px)') }}
          >
            {c.subtitleDa} / {c.subtitleEn}
          </div>
        </div>
        <Image
          src="/vb-logo.png"
          alt="Vejle Boldklub"
          width={500}
          height={500}
          priority
          className="w-auto object-contain"
          style={{
            height: skaleret('clamp(105px, 7vw, 230px)'),
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.18))',
          }}
        />
      </header>

      {/* Ingen min-h-0 på main. Uden den kan indholdet skubbe siden højere end
          vinduet, hvis selv den mindste skrift ikke er nok — så bliver teksten
          rullet til frem for klippet af. */}
      <main className="flex-1 flex flex-col px-[2.5vw] pt-[2.8vh] pb-[3.2vh]">
        <section
          className="grid flex-1 gap-[1.4vw]"
          style={{
            // Billedkolonnen er lidt bredere end et kostkort. Et foto af maden
            // skal kunne ses på afstand, og det har ingen tekst, der kan skrues
            // ned for at få plads.
            gridTemplateColumns:
              `repeat(${c.blocks.length + (data.ekstraBesked ? 1 : 0)}, 1fr)` +
              (layout === 'side' ? ' 1.4fr' : ''),
          }}
        >
          {c.blocks.map((block, i) => (
            <div key={i} className={kortKlasse} style={{ boxShadow: '0 14px 32px rgba(15,23,42,.09)' }}>
              <h2
                className="font-black text-center flex items-center justify-center leading-[1.1]"
                style={overskriftStil}
              >
                {block.titleDa} / {block.titleEn}
              </h2>

              <div className="bg-[#F8FAFC] rounded-[22px] border border-gray-200 flex-1 flex flex-col p-[1.65vh_1.3vw]">
                <span
                  className="inline-block rounded-full font-black mb-[1.25vh] w-max px-[1vw] py-[0.6vh]"
                  style={maerkatStil}
                >
                  Dansk
                </span>
                <p className="whitespace-pre-line font-bold leading-[1.25]" style={tekstStil}>
                  {block.da}
                </p>
              </div>

              <div className="bg-white rounded-[22px] border border-gray-200 flex-1 flex flex-col p-[1.65vh_1.3vw]">
                <span
                  className="inline-block rounded-full font-black mb-[1.25vh] w-max px-[1vw] py-[0.6vh]"
                  style={maerkatStil}
                >
                  English
                </span>
                <p className="whitespace-pre-line font-bold leading-[1.25]" style={tekstStil}>
                  {block.en}
                </p>
              </div>
            </div>
          ))}

          {data.ekstraBesked && (
            <div className={kortKlasse} style={{ boxShadow: '0 14px 32px rgba(15,23,42,.09)' }}>
              <h2
                className="font-black text-center flex items-center justify-center leading-[1.1]"
                style={overskriftStil}
              >
                Besked i dag
              </h2>
              <div className="bg-[#F8FAFC] rounded-[22px] border border-gray-200 flex-1 flex flex-col justify-center p-[1.65vh_1.3vw]">
                <p
                  className="whitespace-pre-line font-bold text-center leading-[1.25]"
                  style={tekstStil}
                >
                  {data.ekstraBesked}
                </p>
              </div>
            </div>
          )}

          {layout === 'side' && (
            <div
              className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-white"
              style={{ boxShadow: '0 14px 32px rgba(15,23,42,.09)' }}
            >
              {billeder.map((b, i) => (
                <BilledLag key={b.id} billede={b} synlig={sideBillede === i} />
              ))}
            </div>
          )}
        </section>
      </main>

      {fuldSkaerm}
    </div>
  );
}

// Ét billede med sin tekst. Ligger oven på de andre og tones ind og ud.
//
// Et almindeligt img-element frem for next/image: filen er skaleret ned ved
// upload, og kiosken skal ikke afhænge af en ekstra omvej gennem Next'
// billedoptimering for at vise den.
function BilledLag({
  billede,
  synlig,
  fuldSkaerm = false,
}: {
  billede: SkaermBillede;
  synlig: boolean;
  fuldSkaerm?: boolean;
}) {
  return (
    <figure
      className="absolute inset-0 m-0 transition-opacity duration-700"
      style={{ opacity: synlig ? 1 : 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={billede.url}
        alt={billede.tekst}
        // Fuld skærm: hele billedet, uden at noget skæres fra. I kolonnen ved
        // siden af kostplanen fylder det derimod rammen ud.
        className={`h-full w-full ${fuldSkaerm ? 'object-contain' : 'object-cover'}`}
      />
      {billede.tekst && (
        <figcaption
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-[3vw] pt-[6vh] pb-[3vh] text-center font-black leading-[1.15] text-white"
          style={{
            fontSize: fuldSkaerm ? 'clamp(48px, 3.6vw, 140px)' : 'clamp(32px, 2vw, 72px)',
          }}
        >
          {billede.tekst}
        </figcaption>
      )}
    </figure>
  );
}
