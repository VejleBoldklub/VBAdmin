"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Medie } from "@/lib/signage/typer";
import { omdoebMedie, sletMedie } from "../actions";
import { FELT } from "../ui";

function stoerrelse(b: number): string {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}

export default function MedieListe({ medier, brug }: { medier: Medie[]; brug: Record<string, number> }) {
  if (medier.length === 0) return <p className="mt-3 text-sm text-slate-400">Biblioteket er tomt.</p>;

  return (
    <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {medier.map((m) => (
        <MedieKort key={m.id} medie={m} brugt={brug[m.id] ?? 0} />
      ))}
    </ul>
  );
}

function MedieKort({ medie: m, brugt }: { medie: Medie; brugt: number }) {
  const router = useRouter();
  const [navn, setNavn] = useState(m.navn);
  const [fejl, setFejl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function gemNavn() {
    if (navn.trim() === m.navn) return;
    startTransition(async () => {
      const svar = await omdoebMedie(m.id, navn);
      setFejl(svar.ok ? null : svar.fejl);
      router.refresh();
    });
  }

  function slet() {
    if (!window.confirm(`Slet "${m.navn}"? Filen fjernes helt.`)) return;
    startTransition(async () => {
      const svar = await sletMedie(m.id);
      setFejl(svar.ok ? null : svar.fejl);
      router.refresh();
    });
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-[#1e2a44] bg-[#0f1a2e]">
      <div className="aspect-video bg-black">
        {m.type === "video" ? (
          <video src={m.url} className="h-full w-full object-contain" muted controls preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt={m.navn} className="h-full w-full object-contain" loading="lazy" />
        )}
      </div>
      <div className="grid gap-2 p-3">
        <input className={FELT} value={navn} onChange={(e) => setNavn(e.target.value)} onBlur={gemNavn} maxLength={160} aria-label="Navn" />
        <p className="text-xs text-slate-400">
          {m.type === "video" ? "Video" : "Billede"} · {stoerrelse(m.bytes)} ·{" "}
          {brugt ? `bruges i ${brugt} element${brugt > 1 ? "er" : ""}` : "ikke i brug"}
        </p>
        <div className="flex gap-2">
          <a href={m.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-300 underline">
            Åbn
          </a>
          <button type="button" onClick={slet} disabled={isPending || brugt > 0} className="text-xs font-semibold text-red-300 underline disabled:no-underline disabled:opacity-40" title={brugt > 0 ? "Fjern mediet fra playlisterne først" : undefined}>
            Slet
          </button>
        </div>
        {fejl && <p className="text-xs text-red-300">{fejl}</p>}
      </div>
    </li>
  );
}
