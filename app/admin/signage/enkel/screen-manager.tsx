"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Laerred from "@/components/signage/laerred";
import Visning from "@/components/signage/visning";
import { SKABELONER, UGEDAGE, tomtElement, type ElementFelter, type Medie, type Skaerm } from "@/lib/signage/typer";
import { opretElement } from "../actions";
import NySkaerm from "../ny-skaerm";
import { ETIKET, FELT, KNAP, KNAP_ROED, KORT, StatusPrik } from "../ui";

type Props = { skaerme: Skaerm[]; antal: Record<string, number>; medier: Medie[]; nu: number };

const TRIN = ["Vælg skærm", "Vælg indhold", "Planlæg", "Godkend"];

type Indhold = "billede" | "video" | "tekst" | "infoskaerm";

export default function ScreenManager({ skaerme, antal, medier, nu }: Props) {
  const router = useRouter();
  const [trin, setTrin] = useState(0);
  const [skaermId, setSkaermId] = useState<string | null>(skaerme[0]?.id ?? null);
  const [indhold, setIndhold] = useState<Indhold>("billede");
  const [f, setF] = useState<ElementFelter>(tomtElement("billede"));
  const [nySkaerm, setNySkaerm] = useState(false);
  const [hjaelp, setHjaelp] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [faerdig, setFaerdig] = useState(false);
  const [isPending, startTransition] = useTransition();

  const skaerm = skaerme.find((s) => s.id === skaermId) ?? null;
  const saet = <K extends keyof ElementFelter>(k: K, v: ElementFelter[K]) => setF((x) => ({ ...x, [k]: v }));

  function vaelgIndhold(t: Indhold, skabelon?: Partial<ElementFelter>) {
    setIndhold(t);
    setF({ ...tomtElement(t), ...skabelon });
  }

  const medie = f.medieId ? medier.find((m) => m.id === f.medieId) : undefined;
  const vist = useMemo(
    () => ({ ...f, id: "udkast", skaermId: skaermId ?? "", raekkefoelge: 0, medieUrl: medie?.url ?? null, medieType: medie?.type ?? null }),
    [f, skaermId, medie]
  );

  const kanFortsaette =
    trin === 0
      ? !!skaerm
      : trin === 1
        ? indhold === "infoskaerm" || (indhold === "tekst" ? !!f.titel.trim() : !!f.medieId)
        : true;

  function publicer() {
    if (!skaerm) return;
    startTransition(async () => {
      const svar = await opretElement(skaerm.id, f);
      if (svar.ok) {
        setFejl(null);
        setFaerdig(true);
        router.refresh();
      } else setFejl(svar.fejl);
    });
  }

  function forfra() {
    setFaerdig(false);
    setTrin(0);
    vaelgIndhold("billede");
  }

  return (
    <div className="grid gap-8">
      <section>
        <p className={ETIKET}>Mine skærme</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">Hvad vil du vise i dag?</h2>
            <p className="text-sm text-slate-400">Vælg en skærm og opdatér indholdet på få trin.</p>
          </div>
          <button type="button" className={KNAP_ROED} onClick={() => setNySkaerm(!nySkaerm)}>
            ＋ Ny skærm
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skaerme.map((s) => (
            <div key={s.id} className={`${KORT} ${skaermId === s.id ? "border-[#e11d48]" : ""}`}>
              <p className={ETIKET}>{s.placering || "Skærm"}</p>
              <p className="mt-1 text-lg font-bold text-white">{s.navn}</p>
              <div className="mt-1">
                <StatusPrik skaerm={s} nu={nu} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{antal[s.id] ?? 0} aktive elementer i playlisten</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={KNAP}
                  onClick={() => {
                    setSkaermId(s.id);
                    setFaerdig(false);
                    setTrin(1);
                    document.getElementById("publicering")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Opdatér indhold →
                </button>
                <Link href={`/admin/signage/studio?skaerm=${s.id}`} className={KNAP}>
                  Redigér alt
                </Link>
              </div>
            </div>
          ))}

          {nySkaerm ? (
            <div className={KORT}>
              <p className={ETIKET}>Tilføj en skærm</p>
              <div className="mt-3">
                <NySkaerm />
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setNySkaerm(true)} className={`${KORT} border-dashed text-left hover:border-slate-400`}>
              <p className="text-3xl text-slate-300">＋</p>
              <p className="mt-2 font-bold text-white">Tilføj en skærm</p>
              <p className="text-sm text-slate-400">Når I er klar til flere skærme</p>
            </button>
          )}

          <div className={KORT}>
            <p className="text-2xl text-slate-300">✦</p>
            <p className="mt-2 font-bold text-white">Hurtig hjælp</p>
            <p className="text-sm text-slate-400">Få hjælp til at oprette og planlægge indhold</p>
            <button type="button" className={`${KNAP} mt-3`} onClick={() => setHjaelp(!hjaelp)}>
              {hjaelp ? "Skjul vejledning" : "Vis vejledning"}
            </button>
            {hjaelp && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                <li>Læg billeder og videoer op under Medier.</li>
                <li>Vælg skærmen nedenfor og følg de fire trin.</li>
                <li>Indholdet lægges sidst i skærmens playliste og er live inden for et minut.</li>
                <li>
                  En ny skærm sættes op efter{" "}
                  <Link href="/admin/signage/vejledning" className="underline">
                    vejledningen
                  </Link>
                  .
                </li>
              </ol>
            )}
          </div>
        </div>
      </section>

      <section id="publicering" className={KORT}>
        <p className={ETIKET}>Enkel publicering</p>
        <h2 className="mt-1 text-xl font-black text-white">{skaerm ? `Opdatér ${skaerm.navn}` : "Opdatér en skærm"}</h2>

        <ol className="mt-4 grid gap-2 sm:grid-cols-4">
          {TRIN.map((t, i) => (
            <li
              key={t}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                i === trin && !faerdig ? "bg-[#b4122a] text-white" : i < trin || faerdig ? "bg-[#14223d] text-emerald-300" : "bg-[#0a1324] text-slate-500"
              }`}
            >
              {i + 1} · {t}
            </li>
          ))}
        </ol>

        {faerdig && skaerm ? (
          <div className="mt-6">
            <p className="text-lg font-bold text-emerald-300">✓ Publiceret på {skaerm.navn}.</p>
            <p className="mt-1 text-sm text-slate-300">Det vises på skærmen inden for {skaerm.opdaterSekunder} sekunder.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className={KNAP_ROED} onClick={forfra}>
                Publicér mere
              </button>
              <Link href={`/admin/signage/studio?skaerm=${skaerm.id}`} className={KNAP}>
                Se playlisten
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div>
              {trin === 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {skaerme.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSkaermId(s.id)}
                      className={`rounded-xl border p-4 text-left ${skaermId === s.id ? "border-[#e11d48] bg-[#1a2540]" : "border-[#2a3a5c] bg-[#0a1324]"}`}
                    >
                      <p className="font-bold text-white">{skaermId === s.id ? "✓ " : ""}{s.navn}</p>
                      <p className="text-xs text-slate-400">{s.placering}</p>
                    </button>
                  ))}
                  {skaerme.length === 0 && <p className="text-sm text-slate-400">Opret en skærm først.</p>}
                </div>
              )}

              {trin === 1 && (
                <div className="grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["billede", "Billede"],
                        ["video", "Video"],
                        ["tekst", "Tekstbesked"],
                        ["infoskaerm", "Infoskærm Cafeteria"],
                      ] as const
                    ).map(([t, navn]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => vaelgIndhold(t)}
                        className={indhold === t ? KNAP_ROED : KNAP}
                      >
                        {navn}
                      </button>
                    ))}
                  </div>

                  {(indhold === "billede" || indhold === "video") && (
                    <MedieValg medier={medier.filter((m) => m.type === indhold)} valgt={f.medieId} onValg={(id) => saet("medieId", id)} />
                  )}

                  {indhold === "tekst" && (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={ETIKET}>Skabelon</span>
                        {SKABELONER.map((s) => (
                          <button key={s.navn} type="button" className={KNAP} onClick={() => vaelgIndhold("tekst", s.felter)}>
                            {s.navn}
                          </button>
                        ))}
                      </div>
                      <input className={FELT} placeholder="Overskrift" value={f.titel} onChange={(e) => saet("titel", e.target.value)} maxLength={200} />
                      <textarea className={FELT} rows={3} placeholder="Tekst" value={f.tekst} onChange={(e) => saet("tekst", e.target.value)} maxLength={2000} />
                      <div className="flex gap-3">
                        <label className="text-xs text-slate-400">
                          Baggrund <input type="color" value={f.baggrund} onChange={(e) => saet("baggrund", e.target.value)} />
                        </label>
                        <label className="text-xs text-slate-400">
                          Tekst <input type="color" value={f.tekstfarve} onChange={(e) => saet("tekstfarve", e.target.value)} />
                        </label>
                      </div>
                    </div>
                  )}

                  {indhold === "infoskaerm" && (
                    <p className="text-sm text-slate-300">Cafeteriets infoskærm med dagens kostplan vises som den ser ud lige nu.</p>
                  )}
                </div>
              )}

              {trin === 2 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={ETIKET}>Vis fra dato</span>
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
                  <label className="block">
                    <span className={ETIKET}>Sekunder på skærmen</span>
                    <input
                      type="number"
                      className={`${FELT} mt-1`}
                      min={indhold === "video" ? 0 : 1}
                      max={3600}
                      placeholder={indhold === "video" ? "Hele videoen" : `Standard (${skaerm?.standardSekunder ?? 10})`}
                      value={f.sekunder ?? ""}
                      onChange={(e) => saet("sekunder", e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </label>
                  <div>
                    <span className={ETIKET}>Dage</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {UGEDAGE.map((d) => (
                        <button
                          key={d.nr}
                          type="button"
                          aria-pressed={f.ugedage.includes(d.nr)}
                          onClick={() =>
                            saet("ugedage", f.ugedage.includes(d.nr) ? f.ugedage.filter((x) => x !== d.nr) : [...f.ugedage, d.nr].sort())
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${f.ugedage.includes(d.nr) ? "bg-[#b4122a] text-white" : "bg-[#14223d] text-slate-400"}`}
                        >
                          {d.kort}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 sm:col-span-2">Lad felterne stå tomme for at vise det altid.</p>
                </div>
              )}

              {trin === 3 && skaerm && (
                <ul className="grid gap-1 text-sm text-slate-200">
                  <li>
                    <b>Skærm:</b> {skaerm.navn}
                  </li>
                  <li>
                    <b>Indhold:</b> {indhold === "tekst" ? `Tekst: ${f.titel}` : indhold === "infoskaerm" ? "Infoskærm Cafeteria" : medie?.navn}
                  </li>
                  <li>
                    <b>Periode:</b> {f.fraDato || f.tilDato ? `${f.fraDato ?? "nu"} – ${f.tilDato ?? "ingen slutdato"}` : "Altid"}
                    {f.fraTid || f.tilTid ? `, kl. ${f.fraTid ?? "00:00"}–${f.tilTid ?? "24:00"}` : ""}
                  </li>
                  <li>
                    <b>Varighed:</b> {f.sekunder ? `${f.sekunder} sek.` : indhold === "video" ? "Hele videoen" : `${skaerm.standardSekunder} sek. (standard)`}
                  </li>
                  <li className="mt-2 text-xs text-slate-400">Lægges sidst i skærmens playliste.</li>
                </ul>
              )}

              {fejl && <p className="mt-3 text-sm text-red-300">{fejl}</p>}

              <div className="mt-6 flex gap-2">
                {trin > 0 && (
                  <button type="button" className={KNAP} onClick={() => setTrin(trin - 1)}>
                    ← Tilbage
                  </button>
                )}
                {trin < 3 ? (
                  <button type="button" className={KNAP_ROED} disabled={!kanFortsaette} onClick={() => setTrin(trin + 1)}>
                    Fortsæt →
                  </button>
                ) : (
                  <button type="button" className={KNAP_ROED} disabled={isPending} onClick={publicer}>
                    {isPending ? "Publicerer …" : "Godkend og publicér"}
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className={ETIKET}>Sådan ser det ud</p>
              <div className="mt-2">
                <Laerred baggrund={skaerm?.baggrund}>
                  {trin >= 1 && (indhold === "infoskaerm" || indhold === "tekst" || f.medieId) ? (
                    <Visning element={vist} standardTilpasning={skaerm?.tilpasning ?? "contain"} lyd={false} onSlut={ingenting} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-white/40">Vælg indhold</div>
                  )}
                </Laerred>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ingenting() {}

function MedieValg({ medier, valgt, onValg }: { medier: Medie[]; valgt: string | null; onValg: (id: string) => void }) {
  if (medier.length === 0) {
    return (
      <p className="text-sm text-amber-300">
        Biblioteket er tomt.{" "}
        <Link href="/admin/signage/medier" className="underline">
          Læg filer op under Medier
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      {medier.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onValg(m.id)}
          title={m.navn}
          className={`relative aspect-video overflow-hidden rounded-md border-2 bg-black ${valgt === m.id ? "border-red-500" : "border-transparent"}`}
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
  );
}
