"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { beskrivPlan, danskTid, elementVisesNu } from "@/lib/signage/plan";
import {
  ELEMENT_NAVNE,
  ELEMENT_TYPER,
  UGEDAGE,
  type Element,
  type ElementFelter,
  type ElementType,
  type Medie,
  type Skaerm,
} from "@/lib/signage/typer";
import { gemElement, gemRaekkefoelge, kopierElement, opretElement, saetElementAktiv, sletElement } from "../../actions";
import { ETIKET, FELT, KNAP, KNAP_ROED } from "../../ui";

type Props = {
  skaerm: Skaerm;
  elementer: Element[];
  medier: Medie[];
  andreSkaerme: { id: string; navn: string }[];
};

const LILLE = "rounded-lg border border-[#2a3a5c] px-2 py-1 text-xs font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40";

function tomme(type: ElementType): ElementFelter {
  return {
    type,
    medieId: null,
    titel: "",
    tekst: "",
    url: "",
    sekunder: null,
    tilpasning: null,
    baggrund: "#b91c1c",
    tekstfarve: "#ffffff",
    justering: "center",
    aktiv: true,
    fraDato: null,
    tilDato: null,
    ugedage: [1, 2, 3, 4, 5, 6, 7],
    fraTid: null,
    tilTid: null,
  };
}

function felterFra(e: Element): ElementFelter {
  const { id: _id, skaermId: _s, raekkefoelge: _r, ...rest } = e;
  void _id;
  void _s;
  void _r;
  return rest;
}

export default function Playliste({ skaerm, elementer, medier, andreSkaerme }: Props) {
  const router = useRouter();
  const [raekke, setRaekke] = useState(elementer);
  const [forrige, setForrige] = useState(elementer);
  const [redigerer, setRedigerer] = useState<string | "ny" | null>(null);
  const [nyType, setNyType] = useState<ElementType>("billede");
  const [fejl, setFejl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Serveren sender en ny liste efter hver ændring. Den lokale rækkefølge
  // følger med, så en flytning ikke bliver hængende i en gammel tilstand.
  if (elementer !== forrige) {
    setForrige(elementer);
    setRaekke(elementer);
  }

  const medieEfterId = new Map(medier.map((m) => [m.id, m]));
  const tid = danskTid();

  function koer(handling: () => Promise<{ ok: boolean; fejl?: string }>, efter?: () => void) {
    startTransition(async () => {
      const svar = await handling();
      if (svar.ok) {
        setFejl(null);
        efter?.();
      } else setFejl(svar.fejl ?? "Noget gik galt.");
      router.refresh();
    });
  }

  function flyt(i: number, retning: -1 | 1) {
    const j = i + retning;
    if (j < 0 || j >= raekke.length) return;
    const ny = [...raekke];
    [ny[i], ny[j]] = [ny[j], ny[i]];
    setRaekke(ny);
    koer(() => gemRaekkefoelge(skaerm.id, ny.map((e) => e.id)));
  }

  function kopierTil(e: Element, til: string) {
    if (!til) return;
    koer(() => kopierElement(e.id, til));
  }

  const samlet = raekke
    .filter((e) => e.aktiv)
    .reduce((sum, e) => sum + (e.sekunder && e.sekunder > 0 ? e.sekunder : skaerm.standardSekunder), 0);

  return (
    <div className="mt-4">
      {fejl && <p className="mb-3 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">{fejl}</p>}

      {raekke.length === 0 && <p className="text-sm text-slate-400">Playlisten er tom. Tilføj det første element nedenfor.</p>}

      <ol className="grid gap-2">
        {raekke.map((e, i) => {
          const m = e.medieId ? medieEfterId.get(e.medieId) : undefined;
          const nu = elementVisesNu(e, tid);
          return (
            <li key={e.id} className={`rounded-xl border ${e.aktiv ? "border-[#2a3a5c]" : "border-dashed border-[#2a3a5c] opacity-60"} bg-[#0a1324]`}>
              <div className="flex flex-wrap items-center gap-3 p-3">
                <span className="w-6 text-center text-sm font-black text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <Miniature element={e} medie={m} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {e.titel || m?.navn || (e.type === "web" ? e.url : ELEMENT_NAVNE[e.type])}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ELEMENT_NAVNE[e.type]} ·{" "}
                    {e.type === "video" && !e.sekunder ? "hele videoen" : `${e.sekunder || skaerm.standardSekunder} sek.`} ·{" "}
                    {beskrivPlan(e)}
                    {e.aktiv && (
                      <span className={nu ? " text-emerald-400" : " text-amber-400"}>{nu ? " · vises nu" : " · ikke lige nu"}</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" className={LILLE} onClick={() => flyt(i, -1)} disabled={isPending || i === 0} aria-label="Flyt op">
                    ↑
                  </button>
                  <button type="button" className={LILLE} onClick={() => flyt(i, 1)} disabled={isPending || i === raekke.length - 1} aria-label="Flyt ned">
                    ↓
                  </button>
                  <button type="button" className={LILLE} onClick={() => koer(() => saetElementAktiv(e.id, !e.aktiv))} disabled={isPending}>
                    {e.aktiv ? "Skjul" : "Vis"}
                  </button>
                  <button type="button" className={LILLE} onClick={() => setRedigerer(redigerer === e.id ? null : e.id)}>
                    {redigerer === e.id ? "Luk" : "Redigér"}
                  </button>
                  <button type="button" className={LILLE} onClick={() => koer(() => kopierElement(e.id, skaerm.id))} disabled={isPending}>
                    Dublér
                  </button>
                  {andreSkaerme.length > 0 && (
                    <select
                      className="rounded-lg border border-[#2a3a5c] bg-[#0a1324] px-1 py-1 text-xs text-slate-200"
                      value=""
                      onChange={(ev) => kopierTil(e, ev.target.value)}
                      aria-label="Kopiér til skærm"
                      disabled={isPending}
                    >
                      <option value="">Kopiér til …</option>
                      {andreSkaerme.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.navn}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className={`${LILLE} text-red-300`}
                    disabled={isPending}
                    onClick={() => window.confirm("Fjern elementet fra playlisten?") && koer(() => sletElement(e.id))}
                  >
                    Fjern
                  </button>
                </div>
              </div>
              {redigerer === e.id && (
                <div className="border-t border-[#1e2a44] p-4">
                  <Editor
                    start={felterFra(e)}
                    medier={medier}
                    standardSekunder={skaerm.standardSekunder}
                    travl={isPending}
                    knap="Gem element"
                    onGem={(f) => koer(() => gemElement(e.id, f), () => setRedigerer(null))}
                    onAnnuller={() => setRedigerer(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {raekke.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          En runde med alle aktive elementer tager ca. {Math.round(samlet / 6) / 10} min. (videoer, der spilles til ende,
          er regnet med standardvarigheden).
        </p>
      )}

      <div className="mt-5 rounded-xl border border-[#2a3a5c] bg-[#0b1630] p-4">
        {redigerer === "ny" ? (
          <Editor
            start={tomme(nyType)}
            medier={medier}
            standardSekunder={skaerm.standardSekunder}
            travl={isPending}
            knap="Tilføj til playlisten"
            onGem={(f) => koer(() => opretElement(skaerm.id, f), () => setRedigerer(null))}
            onAnnuller={() => setRedigerer(null)}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className={ETIKET}>Tilføj</span>
            {ELEMENT_TYPER.map((t) => (
              <button
                key={t}
                type="button"
                className={KNAP}
                onClick={() => {
                  setNyType(t);
                  setRedigerer("ny");
                }}
              >
                ＋ {ELEMENT_NAVNE[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Miniature({ element: e, medie: m }: { element: Element; medie?: Medie }) {
  const klasse = "h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black";
  if (m?.type === "billede") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.url} alt="" className={`${klasse} object-cover`} loading="lazy" />;
  }
  if (m?.type === "video") {
    return <video src={`${m.url}#t=1`} className={`${klasse} object-cover`} muted preload="metadata" />;
  }
  const tegn: Record<ElementType, string> = { billede: "▣", video: "▶", tekst: "T", web: "⌘", infoskaerm: "VB" };
  return (
    <div className={`${klasse} flex items-center justify-center text-sm font-black text-white`} style={{ background: e.type === "tekst" ? e.baggrund : "#14223d" }}>
      {tegn[e.type]}
    </div>
  );
}

function Editor({
  start,
  medier,
  standardSekunder,
  travl,
  knap,
  onGem,
  onAnnuller,
}: {
  start: ElementFelter;
  medier: Medie[];
  standardSekunder: number;
  travl: boolean;
  knap: string;
  onGem: (f: ElementFelter) => void;
  onAnnuller: () => void;
}) {
  const [f, setF] = useState<ElementFelter>(start);
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
