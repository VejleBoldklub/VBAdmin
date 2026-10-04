"use client";

import { useEffect, useRef, useState } from "react";
import type { Design } from "@/lib/infoskaerm/design";
import { LAERRED_B, LAERRED_H } from "@/lib/infoskaerm/design";
import { DesignLaerred, useSkala } from "@/components/infoskaerm/design-laerred";

// Designet i fuld skærm, som det vil se ud på kiosken.
//
// Tegnes med den samme komponent som kiosken og skaleres til hele vinduet på
// samme måde. Browserens fuldskærm bedes om ved åbning, så adresselinje og
// faner ikke tager plads; afvises det, vises forhåndsvisningen alligevel i
// hele vinduet.
export default function FuldSkaerm({
  design,
  billedBase,
  besked,
  onLuk,
}: {
  design: Design;
  billedBase: string;
  besked: string;
  onLuk: () => void;
}) {
  const [ramme, setRamme] = useState<HTMLDivElement | null>(null);
  const skala = useSkala(ramme);
  const lukRef = useRef(onLuk);

  useEffect(() => {
    lukRef.current = onLuk;
  }, [onLuk]);

  useEffect(() => {
    if (!ramme) return;

    ramme.requestFullscreen?.().catch(() => {});

    // Forlades browserens fuldskærm med Esc, lukkes forhåndsvisningen også —
    // ellers skulle Esc trykkes to gange.
    const vedSkift = () => {
      if (!document.fullscreenElement) lukRef.current();
    };
    const vedTast = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") lukRef.current();
    };

    document.addEventListener("fullscreenchange", vedSkift);
    window.addEventListener("keydown", vedTast);

    return () => {
      document.removeEventListener("fullscreenchange", vedSkift);
      window.removeEventListener("keydown", vedTast);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [ramme]);

  return (
    <div
      ref={setRamme}
      role="dialog"
      aria-label="Forhåndsvisning i fuld skærm"
      className="group fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden"
      style={{ background: design.baggrund }}
      onClick={onLuk}
    >
      {skala > 0 && (
        <div className="overflow-hidden" style={{ width: LAERRED_B * skala, height: LAERRED_H * skala }}>
          <DesignLaerred design={design} billedBase={billedBase} besked={besked} skala={skala} />
        </div>
      )}

      <p className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
        Klik eller tryk Esc for at lukke
      </p>
    </div>
  );
}
