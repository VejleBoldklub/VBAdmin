"use client";

import { useEffect, useState } from "react";
import {
  BESKED_FELT,
  LAERRED_B,
  LAERRED_H,
  LOGO,
  type Design,
  type DesignElement,
} from "@/lib/infoskaerm/design";
import { skriftFamilie, skriftVariabler } from "@/lib/infoskaerm/skrifttyper";

// Tegningen af et design. Bruges både af kiosken og af editoren, så det, der
// ses i editoren, er præcis det, der kommer på skærmen.

// Hvor meget lærredet på 1920 × 1080 skal skaleres for at passe i rammen.
//
// Målt med en ResizeObserver frem for på vinduet: i editoren er rammen en
// kolonne på siden, ikke hele vinduet.
//
// Elementet sendes ind, ikke en ref: på kiosken skifter rammen element, når
// skærmen går fra et design til kostkortene og tilbage, og en ref ville ikke
// få effekten til at måle det nye.
export function useSkala(el: HTMLElement | null, kunBredde = false): number {
  const [skala, setSkala] = useState(0);

  useEffect(() => {
    if (!el) return;

    const maal = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = kunBredde ? width / LAERRED_B : Math.min(width / LAERRED_B, height / LAERRED_H);
      setSkala(s > 0 ? s : 0);
    };

    maal();
    const observer = new ResizeObserver(maal);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, kunBredde]);

  return skala;
}

export function billedUrl(billedBase: string, sti: string): string {
  return sti === LOGO ? "/vb-logo.png" : billedBase + sti;
}

const JUSTERING = { venstre: "left", midt: "center", hoejre: "right" } as const;
const LODRET = { top: "flex-start", midt: "center", bund: "flex-end" } as const;

// Selve indholdet af ét element. Fylder hele sin boks; placeringen klarer den,
// der kalder.
export function ElementIndhold({
  element: e,
  billedBase,
  besked,
}: {
  element: DesignElement;
  billedBase: string;
  besked: string;
}) {
  if (e.type === "boks") {
    return (
      <div
        className="h-full w-full"
        style={{ background: e.farve, borderRadius: e.radius, opacity: e.opacitet / 100 }}
      />
    );
  }

  if (e.type === "billede") {
    return (
      // Et almindeligt img-element: filen er skaleret ned ved upload, og
      // kiosken skal ikke gå omvejen gennem Next' billedoptimering.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={billedUrl(billedBase, e.sti)}
        alt=""
        draggable={false}
        className="h-full w-full select-none"
        style={{ objectFit: e.tilpasning === "hele" ? "contain" : "cover", borderRadius: e.radius }}
      />
    );
  }

  // En tekst, der kun består af besked-feltet, forsvinder helt på en dag uden
  // besked — også sin baggrund. Ellers stod der et tomt kort på skærmen.
  const tekst = e.tekst.split(BESKED_FELT).join(besked);
  if (e.tekst.includes(BESKED_FELT) && tekst.trim() === "") return null;

  return (
    <div
      className="flex h-full w-full flex-col whitespace-pre-wrap break-words"
      style={{
        justifyContent: LODRET[e.lodret],
        textAlign: JUSTERING[e.justering],
        fontFamily: skriftFamilie(e.skrift),
        fontSize: e.stoerrelse,
        lineHeight: e.linjehoejde,
        fontWeight: e.fed ? 800 : 400,
        fontStyle: e.kursiv ? "italic" : "normal",
        color: e.farve,
        background: e.baggrund ?? "transparent",
        borderRadius: e.radius,
        padding: e.polstring,
      }}
    >
      <span>{tekst}</span>
    </div>
  );
}

// Lærredet i sin fulde størrelse, skaleret med transform. Uden for lærredet
// fylder designets baggrundsfarve, så en skærm i et andet format end 16:9 får
// kanter i samme farve frem for sorte bjælker.
export function DesignLaerred({
  design,
  billedBase,
  besked,
  skala,
}: {
  design: Design;
  billedBase: string;
  besked: string;
  skala: number;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${skriftVariabler}`}
      style={{
        width: LAERRED_B,
        height: LAERRED_H,
        background: design.baggrund,
        transform: `scale(${skala})`,
        transformOrigin: "top left",
      }}
    >
      {design.elementer.map((e) => (
        <div
          key={e.id}
          className="absolute"
          style={{ left: e.x, top: e.y, width: e.b, height: e.h }}
        >
          <ElementIndhold element={e} billedBase={billedBase} besked={besked} />
        </div>
      ))}
    </div>
  );
}
