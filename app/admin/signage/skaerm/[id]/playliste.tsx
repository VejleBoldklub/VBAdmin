"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { beskrivPlan, danskTid, elementVisesNu } from "@/lib/signage/plan";
import {
  ELEMENT_NAVNE,
  ELEMENT_TYPER,
  type Element,
  type ElementType,
  type Medie,
  type Skaerm,
  felterFraElement,
  tomtElement,
} from "@/lib/signage/typer";
import { gemElement, gemRaekkefoelge, kopierElement, opretElement, saetElementAktiv, sletElement } from "../../actions";
import { ETIKET, KNAP } from "../../ui";
import Editor from "../../element-editor";

type Props = {
  skaerm: Skaerm;
  elementer: Element[];
  medier: Medie[];
  andreSkaerme: { id: string; navn: string }[];
};

const LILLE = "rounded-lg border border-[#2a3a5c] px-2 py-1 text-xs font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40";

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
                    start={felterFraElement(e)}
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
            start={tomtElement(nyType)}
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
