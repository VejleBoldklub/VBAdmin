"use client";

import type { ReactNode } from "react";

// Små formularfelter til editorens egenskabspanel.

export const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

export const FELT =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

export const KNAP =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

export function Etiket({ navn, children }: { navn: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={ETIKET}>{navn}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// Tallet rundes til hele pixels i feltet. Lærredet regner med decimaler, når
// der trækkes, men ingen har brug for at se dem.
export function TalFelt({
  navn,
  vaerdi,
  min,
  maks,
  trin = 1,
  onChange,
}: {
  navn: string;
  vaerdi: number;
  min?: number;
  maks?: number;
  trin?: number;
  onChange: (v: number) => void;
}) {
  const vist = trin < 1 ? Math.round(vaerdi * 100) / 100 : Math.round(vaerdi);

  return (
    <Etiket navn={navn}>
      <input
        type="number"
        className={FELT}
        value={vist}
        min={min}
        max={maks}
        step={trin}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v)) onChange(v);
        }}
      />
    </Etiket>
  );
}

export function FarveFelt({
  navn,
  vaerdi,
  onChange,
}: {
  navn: string;
  vaerdi: string;
  onChange: (v: string) => void;
}) {
  return (
    <Etiket navn={navn}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={navn}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-300"
          value={vaerdi}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <span className="font-mono text-xs text-slate-600">{vaerdi}</span>
      </div>
    </Etiket>
  );
}

export function Valg<T extends string>({
  navn,
  vaerdi,
  valg,
  onChange,
}: {
  navn: string;
  vaerdi: T;
  valg: { v: T; tekst: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className={ETIKET}>{navn}</span>
      <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300">
        {valg.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={vaerdi === o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 px-2 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 ${
              vaerdi === o.v ? "bg-red-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {o.tekst}
          </button>
        ))}
      </div>
    </div>
  );
}
