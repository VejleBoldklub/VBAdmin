"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { lavSlug, type Skaerm, type SkaermFelter } from "@/lib/signage/typer";
import { gemSkaerm, kopierSkaerm, sletSkaerm } from "../../actions";
import { ETIKET, FELT, KNAP, KNAP_ROED } from "../../ui";

function Felt({ etiket, children, hjaelp }: { etiket: string; children: React.ReactNode; hjaelp?: string }) {
  return (
    <label className="block">
      <span className={ETIKET}>{etiket}</span>
      <div className="mt-1">{children}</div>
      {hjaelp && <span className="mt-1 block text-xs text-slate-500">{hjaelp}</span>}
    </label>
  );
}

export default function Indstillinger({ skaerm }: { skaerm: Skaerm }) {
  const router = useRouter();
  const [f, setF] = useState<SkaermFelter>({
    navn: skaerm.navn,
    slug: skaerm.slug,
    placering: skaerm.placering,
    aktiv: skaerm.aktiv,
    tilpasning: skaerm.tilpasning,
    overgang: skaerm.overgang,
    overgangMs: skaerm.overgangMs,
    baggrund: skaerm.baggrund,
    standardSekunder: skaerm.standardSekunder,
    lyd: skaerm.lyd,
    opdaterSekunder: skaerm.opdaterSekunder,
    visUr: skaerm.visUr,
    taendFra: skaerm.taendFra,
    taendTil: skaerm.taendTil,
  });
  const [besked, setBesked] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const saet = <K extends keyof SkaermFelter>(k: K, v: SkaermFelter[K]) => setF((x) => ({ ...x, [k]: v }));

  function gem(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const svar = await gemSkaerm(skaerm.id, f);
      setBesked(svar.ok ? { ok: true, tekst: "Gemt." } : { ok: false, tekst: svar.fejl });
      if (svar.ok) router.refresh();
    });
  }

  function kopier() {
    const navn = window.prompt("Navn på den nye skærm:", `${skaerm.navn} (kopi)`);
    if (!navn) return;
    startTransition(async () => {
      const svar = await kopierSkaerm(skaerm.id, navn, lavSlug(navn));
      if (svar.ok) router.push(`/admin/signage/skaerm/${svar.data}`);
      else setBesked({ ok: false, tekst: svar.fejl });
    });
  }

  function slet() {
    if (!window.confirm(`Slet skærmen "${skaerm.navn}" og hele dens playliste? Medierne bliver i biblioteket.`)) return;
    startTransition(async () => {
      const svar = await sletSkaerm(skaerm.id);
      if (svar.ok) router.push("/admin/signage");
      else setBesked({ ok: false, tekst: svar.fejl });
    });
  }

  return (
    <form onSubmit={gem} className="mt-3 grid gap-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-white">
        <input type="checkbox" checked={f.aktiv} onChange={(e) => saet("aktiv", e.target.checked)} />
        Skærmen er tændt
      </label>

      <Felt etiket="Navn">
        <input className={FELT} value={f.navn} onChange={(e) => saet("navn", e.target.value)} maxLength={80} required />
      </Felt>
      <Felt etiket="Placering">
        <input className={FELT} value={f.placering} onChange={(e) => saet("placering", e.target.value)} maxLength={120} placeholder="fx Cafeteria, ved kassen" />
      </Felt>
      <Felt etiket="Adresse" hjaelp="Ændres adressen, skal skærmen sættes op med den nye URL.">
        <div className="flex items-center gap-1 text-sm text-slate-400">
          /signage/
          <input className={FELT} value={f.slug} onChange={(e) => saet("slug", e.target.value.toLowerCase())} maxLength={50} required />
        </div>
      </Felt>

      <div className="grid grid-cols-2 gap-3">
        <Felt etiket="Standardvarighed (sek.)">
          <input type="number" className={FELT} min={3} max={3600} value={f.standardSekunder} onChange={(e) => saet("standardSekunder", Number(e.target.value))} />
        </Felt>
        <Felt etiket="Tilpasning">
          <select className={FELT} value={f.tilpasning} onChange={(e) => saet("tilpasning", e.target.value as SkaermFelter["tilpasning"])}>
            <option value="contain">Vis hele billedet</option>
            <option value="cover">Fyld skærmen</option>
          </select>
        </Felt>
        <Felt etiket="Overgang">
          <select className={FELT} value={f.overgang} onChange={(e) => saet("overgang", e.target.value as SkaermFelter["overgang"])}>
            <option value="fade">Tone over</option>
            <option value="slide">Glid ind</option>
            <option value="ingen">Ingen</option>
          </select>
        </Felt>
        <Felt etiket="Overgang (ms)">
          <input type="number" className={FELT} min={0} max={3000} step={100} value={f.overgangMs} onChange={(e) => saet("overgangMs", Number(e.target.value))} />
        </Felt>
        <Felt etiket="Tænd fra">
          <input type="time" className={FELT} value={f.taendFra ?? ""} onChange={(e) => saet("taendFra", e.target.value || null)} />
        </Felt>
        <Felt etiket="Sluk kl.">
          <input type="time" className={FELT} value={f.taendTil ?? ""} onChange={(e) => saet("taendTil", e.target.value || null)} />
        </Felt>
        <Felt etiket="Baggrund">
          <input type="color" className="h-10 w-full rounded-lg border border-[#2a3a5c] bg-transparent" value={f.baggrund} onChange={(e) => saet("baggrund", e.target.value)} />
        </Felt>
        <Felt etiket="Hent ændringer (sek.)">
          <input type="number" className={FELT} min={15} max={3600} value={f.opdaterSekunder} onChange={(e) => saet("opdaterSekunder", Number(e.target.value))} />
        </Felt>
      </div>
      <p className="-mt-2 text-xs text-slate-500">Tomme tænd-tider betyder døgnet rundt. Uden for tiden er skærmen sort.</p>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={f.visUr} onChange={(e) => saet("visUr", e.target.checked)} />
        Vis dato og klokkeslæt i hjørnet
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={f.lyd} onChange={(e) => saet("lyd", e.target.checked)} />
        Lyd på videoer (kræver at kiosk-browseren tillader autoplay med lyd)
      </label>

      {besked && <p className={`text-sm ${besked.ok ? "text-emerald-300" : "text-red-300"}`}>{besked.tekst}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isPending} className={KNAP_ROED}>
          {isPending ? "Gemmer …" : "Gem indstillinger"}
        </button>
        <button type="button" onClick={kopier} disabled={isPending} className={KNAP}>
          Kopiér skærm
        </button>
        <button type="button" onClick={slet} disabled={isPending} className={`${KNAP} text-red-300`}>
          Slet
        </button>
      </div>
    </form>
  );
}
