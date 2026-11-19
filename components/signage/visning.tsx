"use client";

import { useEffect, useRef } from "react";
import type { PlayerElement } from "@/lib/signage/typer";

// Ét element, tegnet i fuld størrelse. Bruges af playeren på skærmene og af
// lærredet i Content Studio, så forhåndsvisningen er præcis det, skærmen viser.
export default function Visning({
  element: e,
  standardTilpasning,
  lyd,
  onSlut,
}: {
  element: PlayerElement;
  standardTilpasning: "contain" | "cover";
  lyd: boolean;
  onSlut: () => void;
}) {
  const fit = e.tilpasning ?? standardTilpasning;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Browsere afviser afspilning med lyd uden et klik, medmindre kiosken er sat
  // op til at tillade det. Afvises den, spilles videoen uden lyd frem for slet
  // ikke.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !lyd;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch((err) => {
        console.error("Signage: videoen kunne ikke afspilles:", err);
        onSlut();
      });
    });
  }, [lyd, onSlut]);

  if (e.type === "billede" && e.medieUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={e.medieUrl} alt={e.titel} className="h-full w-full" style={{ objectFit: fit }} />;
  }

  if (e.type === "video" && e.medieUrl) {
    const helVideo = e.sekunder === null || e.sekunder === 0;
    return (
      <video
        ref={videoRef}
        src={e.medieUrl}
        className="h-full w-full"
        style={{ objectFit: fit }}
        playsInline
        muted
        autoPlay
        loop={!helVideo}
        onEnded={helVideo ? onSlut : undefined}
        onError={onSlut}
      />
    );
  }

  if (e.type === "tekst") {
    return (
      <div
        className="@container relative flex h-full w-full flex-col justify-center"
        style={{
          background: e.baggrund,
          color: e.tekstfarve,
          textAlign: e.justering === "center" ? "center" : "left",
        }}
      >
        {e.medieUrl && e.medieType === "billede" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.medieUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="relative px-[8cqw]">
          {e.titel && <h1 className="text-[6cqw] font-extrabold uppercase leading-none tracking-tight">{e.titel}</h1>}
          {e.tekst && <p className="mt-[1.7cqw] whitespace-pre-line text-[2.6cqw] font-medium leading-snug">{e.tekst}</p>}
        </div>
      </div>
    );
  }

  if (e.type === "web" && e.url) {
    return <iframe src={e.url} title={e.titel || "Webside"} className="h-full w-full border-0" />;
  }

  if (e.type === "infoskaerm") {
    return <iframe src="/infoskaerm/cafeteria" title="Infoskærm Cafeteria" className="h-full w-full border-0" />;
  }

  return null;
}
