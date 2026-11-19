"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Et 1920×1080-lærred skaleret ned til den plads, det får. Indholdet tegnes i
// skærmens egen størrelse, så skrift og billeder står som på den rigtige skærm.
export default function Laerred({ baggrund = "#000", children }: { baggrund?: string; children: ReactNode }) {
  const ramme = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(0.3);

  useEffect(() => {
    const el = ramme.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setSkala(el.clientWidth / 1920));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ramme} className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#2a3a5c]" style={{ background: baggrund }}>
      <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left" style={{ transform: `scale(${skala})` }}>
        {children}
      </div>
    </div>
  );
}
