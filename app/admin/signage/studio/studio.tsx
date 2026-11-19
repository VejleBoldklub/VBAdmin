"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import Laerred from "@/components/signage/laerred";
import Visning from "@/components/signage/visning";
import { beskrivPlan } from "@/lib/signage/plan";
import {
  ELEMENT_NAVNE,
  ELEMENT_TYPER,
  SKABELONER,
  felterFraElement,
  tomtElement,
  type Element,
  type ElementFelter,
  type ElementType,
  type Medie,
  type PlayerElement,
  type Skaerm,
} from "@/lib/signage/typer";
import { gemElement, gemRaekkefoelge, opretElement, saetElementAktiv, sletElement } from "../actions";
import Editor from "../element-editor";
import { ETIKET, FELT, KNAP, KORT } from "../ui";

type Props = {
  skaerm: Skaerm;
  skaerme: { id: string; navn: string }[];
  elementer: Element[];
  medier: Medie[];
};

// Hvad der redigeres: et eksisterende element, eller et nyt udkast.
type Valg = { slags: "element"; id: string } | { slags: "nyt"; start: ElementFelter; noegle: number } | null;

export default function Studio({ skaerm, skaerme, elementer, medier }: Props) {
  const router = useRouter();
  const [valg, setValg] = useState<Valg>(elementer[0] ? { slags: "element", id: elementer[0].id } : null);
  const [udkast, setUdkast] = useState<ElementFelter | null>(null);
  const [menu, setMenu] = useState(false);
  const [besked, setBesked] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [taeller, setTaeller] = useState(0);

  const medieEfterId = useMemo(() => new Map(medier.map((m) => [m.id, m])), [medier]);
  const valgtElement = valg?.slags === "element" ? elementer.find((e) => e.id === valg.id) ?? null : null;

  // Lærredet viser udkastet, mens der redigeres — ellers det gemte element.
  const vist: PlayerElement | null = useMemo(() => {
    const f = udkast ?? (valgtElement ? felterFraElement(valgtElement) : null);
    if (!f) return null;
    const m = f.medieId ? medieEfterId.get(f.medieId) : undefined;
    return {
      ...f,
      id: valgtElement?.id ?? "udkast",
      skaermId: skaerm.id,
      raekkefoelge: 0,
      medieUrl: m?.url ?? null,
      medieType: m?.type ?? null,
    };
  }, [udkast, valgtElement, medieEfterId, skaerm.id]);

  // Editoren melder også sin startværdi. Kun en reel ændring er et udkast.
  const aendret =
    !!udkast && (valg?.slags === "nyt" || !valgtElement || JSON.stringify(udkast) !== JSON.stringify(felterFraElement(valgtElement)));

  const onAendring = useCallback((f: ElementFelter) => setUdkast(f), []);
  const ingenting = useCallback(() => {}, []);

  function vaelg(v: Valg) {
    setUdkast(null);
    setValg(v);
    setMenu(false);
    setBesked(null);
  }

  function koer(handling: () => Promise<{ ok: true } | { ok: false; fejl: string }>, tekst: string, efter?: () => void) {
    startTransition(async () => {
      const svar = await handling();
      setBesked(svar.ok ? { ok: true, tekst } : { ok: false, tekst: svar.fejl });
      if (svar.ok) efter?.();
      router.refresh();
    });
  }

  function flyt(retning: -1 | 1) {
    if (!valgtElement) return;
    const i = elementer.findIndex((e) => e.id === valgtElement.id);
    const j = i + retning;
    if (j < 0 || j >= elementer.length) return;
    const ny = elementer.map((e) => e.id);
    [ny[i], ny[j]] = [ny[j], ny[i]];
    koer(() => gemRaekkefoelge(skaerm.id, ny), "Rækkefølgen er gemt.");
  }

  function nyt(type: ElementType, skabelon?: Partial<ElementFelter>) {
    setTaeller((n) => n + 1);
    vaelg({ slags: "nyt", start: { ...tomtElement(type), ...skabelon }, noegle: taeller + 1 });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className={ETIKET}>Destination</span>
            <select
              className={`${FELT} w-auto`}
              value={skaerm.id}
              onChange={(e) => router.push(`/admin/signage/studio?skaerm=${e.target.value}`)}
            >
              {skaerme.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.navn}
                </option>
              ))}
            </select>
          </label>
          <Link href="/admin/signage/medier" className={KNAP}>
            Medier
          </Link>
          <a href={`/signage/${skaerm.slug}?forhaand=1`} target="_blank" rel="noreferrer" className={KNAP}>
            Se hele skærmen ↗
          </a>
          <span className="ml-auto text-xs text-slate-400">Gemte ændringer er live på skærmen inden for {skaerm.opdaterSekunder} sek.</span>
        </div>

        <section className={KORT}>
          <div className="mb-3 flex items-center justify-between">
            <p className={ETIKET}>Redigeringslærred</p>
            <p className="text-xs text-slate-400">
              {skaerm.navn} · 16:9 · {aendret ? "Udkast – ikke gemt endnu" : "Forhåndsvisning"}
            </p>
          </div>
          <Laerred baggrund={skaerm.baggrund}>
            {vist ? (
              <Visning element={vist} standardTilpasning={skaerm.tilpasning} lyd={false} onSlut={ingenting} />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl text-white/40">Vælg eller tilføj et element</div>
            )}
          </Laerred>
        </section>

        <section className={KORT} aria-label="Tidslinje">
          <p className={ETIKET}>Tidslinje</p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {elementer.map((e, i) => {
              const m = e.medieId ? medieEfterId.get(e.medieId) : undefined;
              const aktivt = valg?.slags === "element" && valg.id === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => vaelg({ slags: "element", id: e.id })}
                  className={`w-44 shrink-0 rounded-xl border p-3 text-left ${
                    aktivt ? "border-[#e11d48] bg-[#1a2540]" : "border-[#2a3a5c] bg-[#0a1324] hover:border-slate-400"
                  } ${e.aktiv ? "" : "opacity-50"}`}
                >
                  <p className="truncate text-sm font-bold text-white">
                    {String(i + 1).padStart(2, "0")} · {e.titel || m?.navn || ELEMENT_NAVNE[e.type]}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {e.type === "video" && !e.sekunder ? "Hele videoen" : `${e.sekunder || skaerm.standardSekunder} sek.`}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{e.aktiv ? beskrivPlan(e) : "Skjult"}</p>
                </button>
              );
            })}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenu(!menu)}
                className="flex h-full min-h-20 w-20 items-center justify-center rounded-xl border border-dashed border-[#2a3a5c] text-3xl text-slate-300 hover:border-slate-400"
                aria-label="Tilføj element"
              >
                ＋
              </button>
            </div>
          </div>
          {menu && (
            <div className="mt-3 grid gap-3 rounded-xl border border-[#2a3a5c] bg-[#0b1630] p-3 md:grid-cols-2">
              <div>
                <p className={ETIKET}>Nyt element</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ELEMENT_TYPER.map((t) => (
                    <button key={t} type="button" className={KNAP} onClick={() => nyt(t)}>
                      {ELEMENT_NAVNE[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={ETIKET}>Skabeloner</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SKABELONER.map((s) => (
                    <button key={s.navn} type="button" className={KNAP} onClick={() => nyt("tekst", s.felter)}>
                      {s.navn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className={`${KORT} content-start`}>
        <p className={ETIKET}>Egenskaber</p>
        {besked && <p className={`mt-2 text-sm ${besked.ok ? "text-emerald-300" : "text-red-300"}`}>{besked.tekst}</p>}

        {valg === null && <p className="mt-3 text-sm text-slate-400">Vælg et element på tidslinjen, eller tilføj et nyt med ＋.</p>}

        {valgtElement && (
          <>
            <div className="mt-3 flex flex-wrap gap-1">
              <button type="button" className={KNAP} disabled={isPending} onClick={() => flyt(-1)}>
                ← Før
              </button>
              <button type="button" className={KNAP} disabled={isPending} onClick={() => flyt(1)}>
                Efter →
              </button>
              <button
                type="button"
                className={KNAP}
                disabled={isPending}
                onClick={() => koer(() => saetElementAktiv(valgtElement.id, !valgtElement.aktiv), valgtElement.aktiv ? "Skjult." : "Vises igen.")}
              >
                {valgtElement.aktiv ? "Skjul" : "Vis"}
              </button>
              <button
                type="button"
                className={`${KNAP} text-red-300`}
                disabled={isPending}
                onClick={() =>
                  window.confirm("Fjern elementet fra playlisten?") &&
                  koer(() => sletElement(valgtElement.id), "Fjernet.", () => vaelg(null))
                }
              >
                Fjern
              </button>
            </div>
            <div className="mt-4">
              <Editor
                key={valgtElement.id}
                start={felterFraElement(valgtElement)}
                medier={medier}
                standardSekunder={skaerm.standardSekunder}
                travl={isPending}
                knap="Publicér til skærm"
                onAendring={onAendring}
                onGem={(f) => koer(() => gemElement(valgtElement.id, f), "Publiceret til skærmen.", () => setUdkast(null))}
                onAnnuller={() => vaelg({ slags: "element", id: valgtElement.id })}
              />
            </div>
          </>
        )}

        {valg?.slags === "nyt" && (
          <div className="mt-4">
            <Editor
              key={valg.noegle}
              start={valg.start}
              medier={medier}
              standardSekunder={skaerm.standardSekunder}
              travl={isPending}
              knap="Publicér til skærm"
              onAendring={onAendring}
              onGem={(f) =>
                startTransition(async () => {
                  const svar = await opretElement(skaerm.id, f);
                  if (svar.ok) {
                    setBesked({ ok: true, tekst: "Tilføjet og publiceret." });
                    setUdkast(null);
                    setValg({ slags: "element", id: svar.data });
                  } else setBesked({ ok: false, tekst: svar.fejl });
                  router.refresh();
                })
              }
              onAnnuller={() => vaelg(elementer[0] ? { slags: "element", id: elementer[0].id } : null)}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
