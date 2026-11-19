import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Skaerm } from "@/lib/signage/typer";

// Rammen om Skærme Alliancen. Mørk og i klubbens rød, som "Operations
// Center" i designprototypen på signage.vejleboldklub.dk — portalen er et
// kontrolrum, ikke en formular, og skal kunne skelnes fra resten af adminfladen.

export const KORT = "rounded-2xl border border-[#1e2a44] bg-[#0f1a2e] p-5";
export const ETIKET = "text-[11px] font-black uppercase tracking-[0.2em] text-slate-400";
export const KNAP =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#2a3a5c] bg-[#14223d] px-4 py-2.5 text-sm font-semibold text-white hover:border-slate-400 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";
export const KNAP_ROED =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#b4122a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#d01632] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
export const FELT =
  "w-full rounded-lg border border-[#2a3a5c] bg-[#0a1324] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";

// De tre arbejdsgange fra designprototypen. Alle tre virker på de samme
// skærme og playlister — det er kun måden at arbejde på, der er forskellig, så
// Asger kan vælge den, der passer ham.
export const DESIGNS = [
  { kode: "A", navn: "Operations Center", href: "/admin/signage" },
  { kode: "B", navn: "Content Studio", href: "/admin/signage/studio" },
  { kode: "C", navn: "Screen Manager", href: "/admin/signage/enkel" },
] as const;

export type Design = (typeof DESIGNS)[number]["kode"];

const FANER = [
  { href: "/admin/signage/dagens-farve", navn: "Dagens farve" },
  { href: "/admin/signage/dagtyper", navn: "Dagtyper" },
  { href: "/admin/signage/medier", navn: "Medier" },
  { href: "/admin/signage/vejledning", navn: "Opsætning af skærm" },
  { href: "/admin/infoskaerm", navn: "Infoskærm Cafeteria" },
];

export function SignageShell({
  titel,
  undertitel,
  aktiv,
  design,
  handling,
  children,
}: {
  titel: string;
  undertitel?: string;
  aktiv?: string;
  design?: Design;
  handling?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#080f1d] text-slate-100">
      <div className="border-b border-slate-200 bg-white text-slate-900">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-5 py-2.5 sm:px-8">
          <span className="mr-3 text-sm font-black uppercase tracking-wide">Skærme Alliancen · Designvalg</span>
          {DESIGNS.map((d) => (
            <Link
              key={d.kode}
              href={d.href}
              aria-current={design === d.kode ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                design === d.kode ? "bg-[#b4122a] text-white" : "border border-slate-300 bg-white text-slate-800 hover:border-slate-500"
              }`}
            >
              {d.kode} · {d.navn}
            </Link>
          ))}
          <span className="ml-auto hidden text-xs text-slate-500 md:inline">Tre arbejdsgange · samme skærme og indhold</span>
        </div>
      </div>
      <div className="border-b border-[#1e2a44] bg-[#0b1426]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              <Image src="/vb-logo.png" alt="Vejle Boldklub" width={500} height={500} className="h-12 w-auto" priority />
            </Link>
            <div>
              <p className={ETIKET}>Vejle Boldklub / Skærme Alliancen</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{titel}</h1>
              {undertitel && <p className="mt-1 text-sm text-slate-400">{undertitel}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {handling}
            <Link href="/" className={KNAP}>
              Forside
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-5 sm:px-8" aria-label="Skærme Alliancen">
          {FANER.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${
                aktiv === f.href ? "border-[#e11d48] text-white" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {f.navn}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">{children}</div>
    </main>
  );
}

// Online betyder, at skærmen har hentet sin playliste for nylig. Den henter
// med sit eget interval, så grænsen følger det, med lidt luft til et hik.
export function erOnline(s: Skaerm, nu: number): boolean {
  if (!s.sidstSet) return false;
  return nu - new Date(s.sidstSet).getTime() < (s.opdaterSekunder * 2.5 + 30) * 1000;
}

export function StatusPrik({ skaerm, nu }: { skaerm: Skaerm; nu: number }) {
  const online = erOnline(skaerm, nu);
  const tekst = !skaerm.aktiv ? "Slået fra" : online ? "Online" : skaerm.sidstSet ? "Offline" : "Ikke tilsluttet";
  const farve = !skaerm.aktiv ? "text-slate-400" : online ? "text-emerald-400" : "text-amber-400";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${farve}`}>
      <span aria-hidden>●</span> {tekst}
    </span>
  );
}

export function sidstSetTekst(s: Skaerm): string {
  if (!s.sidstSet) return "Har aldrig været tilsluttet";
  return `Sidst set ${new Date(s.sidstSet).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function OpsaetningMangler() {
  return (
    <div className={`${KORT} border-amber-500/50`}>
      <p className="font-bold text-amber-300">Databasen er ikke sat op endnu</p>
      <p className="mt-2 text-sm text-slate-300">
        Kør <code className="rounded bg-black/40 px-1">supabase/signage.sql</code> i Supabase&apos; SQL-editor. Derefter
        virker portalen.
      </p>
    </div>
  );
}
