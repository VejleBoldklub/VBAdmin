"use client";

import { useEffect, useState } from "react";
import { ELEMENT_NAVNE, UGEDAGE, type ElementFelter, type Medie } from "@/lib/signage/typer";
import { ETIKET, FELT, KNAP, KNAP_ROED } from "./ui";

// Formularen til ét element. Delt af playlisten (A og skærmsiden), Content
// Studio (B) og trinene i Screen Manager (C).
export default function Editor({
  start,
  medier,
  standardSekunder,
  travl,
  knap,
  onGem,
  onAnnuller,
  onAendring,
}: {
  start: ElementFelter;
  medier: Medie[];
  standardSekunder: number;
  travl: boolean;
  knap: string;
  onGem: (f: ElementFelter) => void;
  onAnnuller: () => void;
  // Kaldes ved hver ændring, så et lærred kan vise udkastet, før det gemmes.
  onAendring?: (f: ElementFelter) => void;
}) {
  const [f, setF] = useState<ElementFelter>(start);
  useEffect(() => {
    onAendring?.(f);
  }, [f, onAendring]);

  const saet = <K extends keyof ElementFelter>(k: K, v: ElementFelter[K]) => setF((x) => ({ ...x, [k]: v }));

  const brugerMedie = f.type === "billede" || f.type === "video" || f.type === "tekst";
  const medieType = f.type === "video" ? "video" : "billede";
  const valgbare = medier.filter((m) => m.type === medieType);

  function slaaDag(nr: number) {
    saet("ugedage", f.ugedage.includes(nr) ? f.ugedage.filter((d) => d !== nr) : [...f.ugedage, nr].sort());
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onGem(f);
      }}
    >
      <p className="font-bold text-white">{ELEMENT_NAVNE[f.type]}</p>

      {brugerMedie && (
        <div>
          <p className={ETIKET}>{f.type === "tekst" ? "Baggrundsbillede (valgfrit)" : f.type === "video" ? "Video" : "Billede"}</p>
          {valgbare.length === 0 ? (
            <p className="mt-1 text-sm text-amber-300">
              Der er ingen {medieType === "video" ? "videoer" : "billeder"} i biblioteket endnu.{" "}
              <a href="/admin/signage/medier" className="underline">
                Læg dem op under Medier
              </a>
              .
            </p>
          ) : (
            <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-5">
              {f.type === "tekst" && (
                <button
                  type="button"
                  onClick={() => saet("medieId", null)}
                  className={`aspect-video rounded-md border-2 text-xs text-slate-300 ${f.medieId === null ? "border-red-500" : "border-transparent bg-[#14223d]"}`}
                >
                  Intet
                </button>
              )}
              {valgbare.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.navn}
                  onClick={() => saet("medieId", m.id)}
                  className={`relative aspect-video overflow-hidden rounded-md border-2 bg-black ${f.medieId === m.id ? "border-red-500" : "border-transparent"}`}
                >
                  {m.type === "video" ? (
                    <video src={`${m.url}#t=1`} className="h-full w-full object-cover" muted preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.navn} className="h-full w-full object-cover" loading="lazy" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 text-[10px] text-white">{m.navn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {f.type === "web" && (
        <label className="block">
          <span className={ETIKET}>Adresse</span>
          <input className={`${FELT} mt-1`} type="url" placeholder="https://" value={f.url} onChange={(e) => saet("url", e.target.value)} required />
          <span className="mt-1 block text-xs text-slate-500">Nogle sider tillader ikke at blive vist inde i en anden side og bliver da blanke.</span>
        </label>
      )}

      {f.type === "infoskaerm" && (
        <p className="text-sm text-slate-300">
          Viser cafeteriets infoskærm, præcis som den ser ud lige nu: dagens kostplan, design og billeder. Indholdet styres
          under Infoskærm Cafeteria.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={ETIKET}>{f.type === "tekst" ? "Overskrift" : "Navn i playlisten (valgfrit)"}</span>
          <input className={`${FELT} mt-1`} value={f.titel} onChange={(e) => saet("titel", e.target.value)} maxLength={200} />
        </label>

        {f.type === "tekst" && (
          <>
            <label className="block sm:col-span-2">
              <span className={ETIKET}>Tekst</span>
              <textarea className={`${FELT} mt-1`} rows={4} value={f.tekst} onChange={(e) => saet("tekst", e.target.value)} maxLength={2000} />
            </label>
            <label className="block">
              <span className={ETIKET}>Baggrundsfarve</span>
              <input type="color" className="mt-1 h-10 w-full rounded-lg border border-[#2a3a5c] bg-transparent" value={f.baggrund} onChange={(e) => saet("baggrund", e.target.value)} />
            </label>
            <label className="block">
              <span className={ETIKET}>Tekstfarve</span>
              <input type="color" className="mt-1 h-10 w-full rounded-lg border border-[#2a3a5c] bg-transparent" value={f.tekstfarve} onChange={(e) => saet("tekstfarve", e.target.value)} />
            </label>
            <label className="block">
              <span className={ETIKET}>Justering</span>
              <select className={`${FELT} mt-1`} value={f.justering} onChange={(e) => saet("justering", e.target.value as ElementFelter["justering"])}>
                <option value="center">Centreret</option>
                <option value="venstre">Venstre</option>
              </select>
            </label>
          </>
        )}

        <label className="block">
          <span className={ETIKET}>Varighed (sek.)</span>
          <input
            type="number"
            className={`${FELT} mt-1`}
            min={f.type === "video" ? 0 : 1}
            max={3600}
            placeholder={f.type === "video" ? "Hele videoen" : `Standard (${standardSekunder})`}
            value={f.sekunder ?? ""}
            onChange={(e) => saet("sekunder", e.target.value === "" ? null : Number(e.target.value))}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {f.type === "video" ? "Tom eller 0 = hele videoen. Ellers gentages videoen i det antal sekunder." : "Tom = skærmens standard."}
          </span>
        </label>

        {(f.type === "billede" || f.type === "video") && (
          <label className="block">
            <span className={ETIKET}>Tilpasning</span>
            <select
              className={`${FELT} mt-1`}
              value={f.tilpasning ?? ""}
              onChange={(e) => saet("tilpasning", (e.target.value || null) as ElementFelter["tilpasning"])}
            >
              <option value="">Skærmens standard</option>
              <option value="contain">Vis hele</option>
              <option value="cover">Fyld skærmen</option>
            </select>
          </label>
        )}
      </div>

      <fieldset className="rounded-xl border border-[#1e2a44] p-3">
        <legend className={`${ETIKET} px-1`}>Planlægning</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={ETIKET}>Fra dato</span>
            <input type="date" className={`${FELT} mt-1`} value={f.fraDato ?? ""} onChange={(e) => saet("fraDato", e.target.value || null)} />
          </label>
          <label className="block">
            <span className={ETIKET}>Til og med dato</span>
            <input type="date" className={`${FELT} mt-1`} value={f.tilDato ?? ""} onChange={(e) => saet("tilDato", e.target.value || null)} />
          </label>
          <label className="block">
            <span className={ETIKET}>Fra kl.</span>
            <input type="time" className={`${FELT} mt-1`} value={f.fraTid ?? ""} onChange={(e) => saet("fraTid", e.target.value || null)} />
          </label>
          <label className="block">
            <span className={ETIKET}>Til kl.</span>
            <input type="time" className={`${FELT} mt-1`} value={f.tilTid ?? ""} onChange={(e) => saet("tilTid", e.target.value || null)} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {UGEDAGE.map((d) => (
            <button
              key={d.nr}
              type="button"
              onClick={() => slaaDag(d.nr)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${f.ugedage.includes(d.nr) ? "bg-[#b4122a] text-white" : "bg-[#14223d] text-slate-400"}`}
              aria-pressed={f.ugedage.includes(d.nr)}
            >
              {d.kort}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Tomme felter betyder altid. Tider er danske; fx 22:00–06:00 går hen over midnat.</p>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={f.aktiv} onChange={(e) => saet("aktiv", e.target.checked)} />
        Aktiv
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={travl} className={KNAP_ROED}>
          {travl ? "Gemmer …" : knap}
        </button>
        <button type="button" onClick={onAnnuller} className={KNAP}>
          Annullér
        </button>
      </div>
    </form>
  );
}
