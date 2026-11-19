"use client";

import { useEffect, useRef, useState } from "react";

// Playeren tegnes i 1920×1080 og skaleres ned til kortets bredde, så
// forhåndsvisningen ser ud som skærmen og ikke som en lille browser.
export default function Forhaandsvisning({ src }: { src: string }) {
  const ramme = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(0.2);

  useEffect(() => {
    const el = ramme.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setSkala(el.clientWidth / 1920));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ramme} className="relative mt-3 aspect-video overflow-hidden rounded-lg border border-[#2a3a5c] bg-black">
      <iframe
        src={src}
        title="Forhåndsvisning"
        className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left border-0"
        style={{ transform: `scale(${skala})` }}
      />
    </div>
  );
}
