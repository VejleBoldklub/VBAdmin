'use client';

import { useEffect, useState } from 'react';
import { DAY_CONTENT, farveTilNavn, type DagFarve, type DagIndhold } from '@/lib/infoskaerm/content';

interface ScreenData {
  farve: DagFarve;
  navn: string;
  ekstraBesked: string;
  content: DagIndhold;
}

const POLL_INTERVAL_MS = 120_000; // 2 min, samme som den gamle Apps Script-løsning

// Svaret fra /api/infoskaerm/today er ukendte data, indtil det er kontrolleret.
// Skærmen står uden opsyn i cafeteriet, så et uventet svar må ikke kunne
// erstatte en gyldig visning med et halvt tegnet skærmbillede.
function erSkaermData(vaerdi: unknown): vaerdi is ScreenData & { ok: true } {
  if (typeof vaerdi !== 'object' || vaerdi === null) return false;

  const v = vaerdi as Record<string, unknown>;

  return (
    v.ok === true &&
    typeof v.farve === 'string' &&
    v.farve in DAY_CONTENT &&
    typeof v.navn === 'string' &&
    typeof v.ekstraBesked === 'string' &&
    typeof v.content === 'object' &&
    v.content !== null
  );
}

export default function ScreenView({ initial }: { initial: ScreenData }) {
  const [data, setData] = useState<ScreenData>(initial);

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

  const c = data.content;

  // Roboto er projektets skrifttype, jf. SYSTEM.md §10. Leverancen bad om
  // Quicksand, som ikke er indlæst nogen steder i appen og derfor i praksis
  // ville være blevet til Arial.
  const skaermStil = {
    fontFamily: 'var(--font-roboto), Arial, sans-serif',
    background: '#F4F6FB',
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={skaermStil}>
      <header
        className="flex items-center justify-between px-[3vw] py-[2.2vh]"
        style={{ height: '16vh', minHeight: 145, background: c.color, color: c.headerTextColor }}
      >
        <div>
          <div className="font-black leading-[0.95]" style={{ fontSize: 'clamp(82px, 4.8vw, 165px)' }}>
            {c.title}
          </div>
          <div className="font-extrabold mt-[0.8vh]" style={{ fontSize: 'clamp(34px, 2vw, 68px)' }}>
            {c.subtitleDa} / {c.subtitleEn}
          </div>
        </div>
        <img
          src="/vb-logo.png"
          alt="Vejle Boldklub logo"
          className="object-contain"
          style={{ height: 'clamp(105px, 7vw, 230px)', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.18))' }}
        />
      </header>

      <main className="flex-1 px-[2.5vw] pt-[2.8vh] pb-[3.2vh] min-h-0">
        <section
          className="grid h-full gap-[1.4vw]"
          style={{ gridTemplateColumns: `repeat(${c.blocks.length + (data.ekstraBesked ? 1 : 0)}, 1fr)` }}
        >
          {c.blocks.map((block, i) => (
            <div
              key={i}
              className="bg-white rounded-[32px] border border-gray-200 flex flex-col gap-[1.25vh] overflow-hidden min-h-0 p-[1.8vh_1.65vw_2.1vh_1.65vw]"
              style={{ boxShadow: '0 14px 32px rgba(15,23,42,.09)' }}
            >
              <h2
                className="font-black text-center flex items-center justify-center"
                style={{ color: c.color, fontSize: 'clamp(52px, 3.1vw, 110px)', minHeight: 'clamp(100px, 6.4vw, 220px)' }}
              >
                {block.titleDa} / {block.titleEn}
              </h2>

              <div className="bg-[#F8FAFC] rounded-[22px] border border-gray-200 flex-1 min-h-0 flex flex-col p-[1.65vh_1.3vw]">
                <span
                  className="inline-block rounded-full font-black mb-[1.25vh] w-max px-[1vw] py-[0.6vh]"
                  style={{ background: c.lightColor, border: `2px solid ${c.color}`, fontSize: 'clamp(26px, 1.45vw, 50px)' }}
                >
                  Dansk
                </span>
                <p className="whitespace-pre-line font-bold" style={{ fontSize: 'clamp(42px, 2.15vw, 78px)' }}>
                  {block.da}
                </p>
              </div>

              <div className="bg-white rounded-[22px] border border-gray-200 flex-1 min-h-0 flex flex-col p-[1.65vh_1.3vw]">
                <span
                  className="inline-block rounded-full font-black mb-[1.25vh] w-max px-[1vw] py-[0.6vh]"
                  style={{ background: c.lightColor, border: `2px solid ${c.color}`, fontSize: 'clamp(26px, 1.45vw, 50px)' }}
                >
                  English
                </span>
                <p className="whitespace-pre-line font-bold" style={{ fontSize: 'clamp(42px, 2.15vw, 78px)' }}>
                  {block.en}
                </p>
              </div>
            </div>
          ))}

          {data.ekstraBesked && (
            <div
              className="bg-white rounded-[32px] border border-gray-200 flex flex-col gap-[1.25vh] overflow-hidden min-h-0 p-[1.8vh_1.65vw_2.1vh_1.65vw]"
              style={{ boxShadow: '0 14px 32px rgba(15,23,42,.09)' }}
            >
              <h2
                className="font-black text-center flex items-center justify-center"
                style={{ color: c.color, fontSize: 'clamp(52px, 3.1vw, 110px)', minHeight: 'clamp(100px, 6.4vw, 220px)' }}
              >
                Besked i dag
              </h2>
              <div className="bg-[#F8FAFC] rounded-[22px] border border-gray-200 flex-1 min-h-0 flex flex-col p-[1.65vh_1.3vw] justify-center">
                <p className="whitespace-pre-line font-bold text-center" style={{ fontSize: 'clamp(42px, 2.15vw, 78px)' }}>
                  {data.ekstraBesked}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
