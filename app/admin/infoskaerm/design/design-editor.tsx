"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type PointerEvent } from "react";
import {
  designFraKostplan,
  GRAENSER,
  LAERRED_B,
  LAERRED_H,
  LOGO,
  nytId,
  tekst as nyTekst,
  type Design,
  type DesignElement,
} from "@/lib/infoskaerm/design";
import type { DagFarve, DagIndhold } from "@/lib/infoskaerm/content";
import { skalerNed } from "@/lib/infoskaerm/skaler-billede";
import { billedUrl, DesignLaerred, useSkala } from "@/components/infoskaerm/design-laerred";
import { gemDesign, lagDesignBilledeOp } from "./actions";
import { ElementPanel } from "./egenskaber";
import { FarveFelt, KNAP } from "./felter";

// Editoren til ét farvedesign.
//
// Lærredet tegnes med den samme komponent som kiosken bruger. Oven på det
// ligger et lag med en usynlig ramme pr. element i skærmens egne pixels; det er
// det lag, man trækker i. Rammerne ligger uden for det skalerede lærred, så
// håndtagene har samme størrelse, uanset hvor meget lærredet er skaleret ned.

type Haandtag = { v: boolean; h: boolean; o: boolean; n: boolean };

type Traek = {
  id: string;
  type: "flyt" | "stoerrelse";
  haandtag: Haandtag;
  startX: number;
  startY: number;
  start: DesignElement;
  bevaegede: boolean;
};

type Hjaelpelinjer = { lodret: number[]; vandret: number[] };

const HAANDTAG: { navn: string; h: Haandtag; cursor: string; x: number; y: number }[] = [
  { navn: "nv", h: { v: true, h: false, o: true, n: false }, cursor: "nwse-resize", x: 0, y: 0 },
  { navn: "n", h: { v: false, h: false, o: true, n: false }, cursor: "ns-resize", x: 0.5, y: 0 },
  { navn: "nø", h: { v: false, h: true, o: true, n: false }, cursor: "nesw-resize", x: 1, y: 0 },
  { navn: "ø", h: { v: false, h: true, o: false, n: false }, cursor: "ew-resize", x: 1, y: 0.5 },
  { navn: "sø", h: { v: false, h: true, o: false, n: true }, cursor: "nwse-resize", x: 1, y: 1 },
  { navn: "s", h: { v: false, h: false, o: false, n: true }, cursor: "ns-resize", x: 0.5, y: 1 },
  { navn: "sv", h: { v: true, h: false, o: false, n: true }, cursor: "nesw-resize", x: 0, y: 1 },
  { navn: "v", h: { v: true, h: false, o: false, n: false }, cursor: "ew-resize", x: 0, y: 0.5 },
];

// Hvor tæt (i skærmpixels) en kant skal være på en anden, før den klikker fast.
const SNAP = 7;

const HISTORIK_MAKS = 100;

const EKSEMPEL_BESKED = "Her står dagens besked fra ugeplanen";

function navnPaa(e: DesignElement): string {
  if (e.type === "tekst") return e.tekst.trim().split("\n")[0].slice(0, 40) || "Tom tekst";
  if (e.type === "billede") return e.sti === LOGO ? "Logo" : "Billede";
  return "Felt";
}

export default function DesignEditor({
  farve,
  start,
  startAktiv,
  indhold,
  billedBase,
  andre,
}: {
  farve: DagFarve;
  start: Design | null;
  startAktiv: boolean;
  indhold: DagIndhold;
  billedBase: string;
  // De gemte designs for de to andre farver, så ét kan kopieres herover.
  andre: { farve: DagFarve; design: Design }[];
}) {
  // Designet og fortryd-historikken i én tilstand, så et trin altid flytter
  // dem sammen.
  const [tilstand, setTilstand] = useState<{ design: Design; fortid: Design[]; fremtid: Design[] }>(
    () => ({ design: start ?? designFraKostplan(indhold), fortid: [], fremtid: [] })
  );
  const { design, fortid, fremtid } = tilstand;
  const [aktiv, setAktiv] = useState(startAktiv);
  const [valgt, setValgt] = useState<string | null>(null);
  const [aendret, setAendret] = useState(start === null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [besked, setBesked] = useState<string | null>(null);
  const [linjer, setLinjer] = useState<Hjaelpelinjer>({ lodret: [], vandret: [] });
  const [isPending, startTransition] = useTransition();
  const [lagerOp, setLagerOp] = useState(false);

  const [ramme, setRamme] = useState<HTMLDivElement | null>(null);
  const tekstRef = useRef<HTMLTextAreaElement>(null);
  const filRef = useRef<HTMLInputElement>(null);
  const traekRef = useRef<Traek | null>(null);
  const samleRef = useRef<{ noegle: string; tid: number } | null>(null);
  // Om det næste billede, der vælges, skal udskifte det valgte eller tilføjes.
  const udskiftRef = useRef(false);

  const skala = useSkala(ramme, true);
  const valgtElement = design.elementer.find((e) => e.id === valgt) ?? null;

  // Gem et trin i historikken, før designet ændres.
  //
  // Med en samlenøgle bliver ændringer i samme felt inden for et sekund ét
  // trin. Ellers ville fortryd tage ét bogstav ad gangen.
  const aendre = useCallback(
    (fn: (d: Design) => Design, samle?: string) => {
      const nu = Date.now();
      const forrige = samleRef.current;
      const sammeTrin = samle && forrige && forrige.noegle === samle && nu - forrige.tid < 1000;

      setTilstand((t) => ({
        design: fn(t.design),
        fortid: sammeTrin ? t.fortid : [...t.fortid.slice(-HISTORIK_MAKS + 1), t.design],
        fremtid: [],
      }));

      samleRef.current = samle ? { noegle: samle, tid: nu } : null;
      setAendret(true);
      setBesked(null);
    },
    []
  );

  const opdaterElement = useCallback(
    (id: string, felter: Partial<DesignElement>, samle?: string) => {
      aendre(
        (d) => ({
          ...d,
          elementer: d.elementer.map((e) => (e.id === id ? ({ ...e, ...felter } as DesignElement) : e)),
        }),
        samle ? `${id}:${samle}` : undefined
      );
    },
    [aendre]
  );

  const fortryd = useCallback(() => {
    setTilstand((t) =>
      t.fortid.length === 0
        ? t
        : {
            design: t.fortid[t.fortid.length - 1],
            fortid: t.fortid.slice(0, -1),
            fremtid: [t.design, ...t.fremtid],
          }
    );
    setAendret(true);
    samleRef.current = null;
  }, []);

  const gentag = useCallback(() => {
    setTilstand((t) =>
      t.fremtid.length === 0
        ? t
        : { design: t.fremtid[0], fortid: [...t.fortid, t.design], fremtid: t.fremtid.slice(1) }
    );
    setAendret(true);
    samleRef.current = null;
  }, []);

  const slet = useCallback(
    (id: string) => {
      aendre((d) => ({ ...d, elementer: d.elementer.filter((e) => e.id !== id) }));
      setValgt(null);
    },
    [aendre]
  );

  const dupliker = useCallback(
    (id: string) => {
      const kopiId = nytId();
      aendre((d) => {
        const i = d.elementer.findIndex((e) => e.id === id);
        if (i < 0 || d.elementer.length >= GRAENSER.elementer) return d;
        const kopi = { ...d.elementer[i], id: kopiId, x: d.elementer[i].x + 30, y: d.elementer[i].y + 30 };
        return { ...d, elementer: [...d.elementer.slice(0, i + 1), kopi, ...d.elementer.slice(i + 1)] };
      });
      setValgt(kopiId);
    },
    [aendre]
  );

  function tilfoej(element: DesignElement) {
    if (design.elementer.length >= GRAENSER.elementer) {
      setFejl(`Et design kan højst have ${GRAENSER.elementer} elementer.`);
      return;
    }
    aendre((d) => ({ ...d, elementer: [...d.elementer, element] }));
    setValgt(element.id);
  }

  function flytLag(id: string, retning: "frem" | "tilbage" | "forrest" | "bagerst") {
    aendre((d) => {
      const liste = [...d.elementer];
      const i = liste.findIndex((e) => e.id === id);
      if (i < 0) return d;
      const [e] = liste.splice(i, 1);
      const ny =
        retning === "forrest" ? liste.length
        : retning === "bagerst" ? 0
        : retning === "frem" ? Math.min(liste.length, i + 1)
        : Math.max(0, i - 1);
      liste.splice(ny, 0, e);
      return { ...d, elementer: liste };
    });
  }

  // Tastatur: slet, flyt med pilene, fortryd og gentag, dupliker.
  //
  // Lyttes på vinduet, men ikke mens man skriver i et felt — så ville
  // Backspace i tekstfeltet slette hele elementet.
  useEffect(() => {
    function tast(ev: KeyboardEvent) {
      const maal = ev.target as HTMLElement | null;
      if (maal && (maal.closest("input, textarea, select") || maal.isContentEditable)) return;

      const mod = ev.metaKey || ev.ctrlKey;

      if (mod && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) gentag();
        else fortryd();
        return;
      }
      if (mod && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        gentag();
        return;
      }

      if (!valgt) return;

      if (mod && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        dupliker(valgt);
        return;
      }
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        slet(valgt);
        return;
      }
      if (ev.key === "Escape") {
        setValgt(null);
        return;
      }

      const trin = ev.shiftKey ? 10 : 1;
      const flyt: Record<string, [number, number]> = {
        ArrowLeft: [-trin, 0],
        ArrowRight: [trin, 0],
        ArrowUp: [0, -trin],
        ArrowDown: [0, trin],
      };
      const d = flyt[ev.key];
      if (!d) return;

      ev.preventDefault();
      const e = design.elementer.find((x) => x.id === valgt);
      if (e) opdaterElement(valgt, { x: e.x + d[0], y: e.y + d[1] }, "pil");
    }

    window.addEventListener("keydown", tast);
    return () => window.removeEventListener("keydown", tast);
  }, [valgt, design, fortryd, gentag, dupliker, slet, opdaterElement]);

  // Advar, hvis siden forlades med ændringer, der ikke er gemt.
  useEffect(() => {
    if (!aendret) return;
    const advar = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", advar);
    return () => window.removeEventListener("beforeunload", advar);
  }, [aendret]);

  // ---------------------------------------------------------------------------
  // Træk og skalér
  // ---------------------------------------------------------------------------

  function begynd(ev: PointerEvent, e: DesignElement, type: Traek["type"], haandtag?: Haandtag) {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);

    setValgt(e.id);
    traekRef.current = {
      id: e.id,
      type,
      haandtag: haandtag ?? { v: false, h: false, o: false, n: false },
      startX: ev.clientX,
      startY: ev.clientY,
      start: e,
      bevaegede: false,
    };
  }

  // Fastgør en position til lærredets kanter og midte og til de andre
  // elementers kanter og midter. Returnerer den justerede værdi og den linje,
  // den klikkede fast på.
  function snap(vaerdier: number[], maal: number[]): { forskyd: number; linje: number | null } {
    const graense = SNAP / (skala || 1);
    let bedst: { forskyd: number; linje: number | null } = { forskyd: 0, linje: null };
    let afstand = graense;

    for (const v of vaerdier) {
      for (const m of maal) {
        const a = Math.abs(m - v);
        if (a < afstand) {
          afstand = a;
          bedst = { forskyd: m - v, linje: m };
        }
      }
    }
    return bedst;
  }

  function bevaeg(ev: PointerEvent) {
    const t = traekRef.current;
    if (!t || !skala) return;

    const dx = (ev.clientX - t.startX) / skala;
    const dy = (ev.clientY - t.startY) / skala;

    if (!t.bevaegede) {
      if (Math.abs(dx) * skala < 2 && Math.abs(dy) * skala < 2) return;
      // Første bevægelse: ét trin i historikken for hele trækket.
      t.bevaegede = true;
      setTilstand((tl) => ({
        ...tl,
        fortid: [...tl.fortid.slice(-HISTORIK_MAKS + 1), tl.design],
        fremtid: [],
      }));
      setAendret(true);
      setBesked(null);
      samleRef.current = null;
    }

    const s = t.start;
    let { x, y, b, h } = s;
    const nyeLinjer: Hjaelpelinjer = { lodret: [], vandret: [] };

    if (t.type === "flyt") {
      x = s.x + dx;
      y = s.y + dy;

      if (!ev.altKey) {
        const andre = design.elementer.filter((e) => e.id !== t.id);
        const lodretMaal = [0, LAERRED_B / 2, LAERRED_B, ...andre.flatMap((e) => [e.x, e.x + e.b / 2, e.x + e.b])];
        const vandretMaal = [0, LAERRED_H / 2, LAERRED_H, ...andre.flatMap((e) => [e.y, e.y + e.h / 2, e.y + e.h])];

        const sx = snap([x, x + b / 2, x + b], lodretMaal);
        const sy = snap([y, y + h / 2, y + h], vandretMaal);
        x += sx.forskyd;
        y += sy.forskyd;
        if (sx.linje !== null) nyeLinjer.lodret.push(sx.linje);
        if (sy.linje !== null) nyeLinjer.vandret.push(sy.linje);
      }
    } else {
      const hd = t.haandtag;
      if (hd.h) b = s.b + dx;
      if (hd.v) { b = s.b - dx; }
      if (hd.n) h = s.h + dy;
      if (hd.o) { h = s.h - dy; }

      // Et billede beholder sine proportioner, når der trækkes i et hjørne —
      // ellers bliver maden mast. Shift slår det fra (og til for de andre).
      const hjoerne = (hd.v || hd.h) && (hd.o || hd.n);
      const bevar = hjoerne && (s.type === "billede") !== ev.shiftKey;
      if (bevar && s.h > 0) {
        const forhold = s.b / s.h;
        if (Math.abs(b - s.b) / s.b > Math.abs(h - s.h) / s.h) h = b / forhold;
        else b = h * forhold;
      }

      b = Math.max(GRAENSER.minMaal, b);
      h = Math.max(GRAENSER.minMaal, h);
      if (hd.v) x = s.x + s.b - b;
      if (hd.o) y = s.y + s.h - h;
    }

    setLinjer(nyeLinjer);
    setTilstand((tl) => ({
      ...tl,
      design: {
        ...tl.design,
        elementer: tl.design.elementer.map((e) =>
          e.id === t.id ? ({ ...e, x, y, b, h } as DesignElement) : e
        ),
      },
    }));
  }

  function slip() {
    traekRef.current = null;
    setLinjer({ lodret: [], vandret: [] });
  }

  // ---------------------------------------------------------------------------
  // Billeder
  // ---------------------------------------------------------------------------

  async function naturligStoerrelse(url: string): Promise<{ b: number; h: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ b: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function vaelgBillede(udskift: boolean) {
    udskiftRef.current = udskift;
    filRef.current?.click();
  }

  async function billedeValgt(fil: File) {
    setFejl(null);
    setLagerOp(true);

    try {
      const blob = await skalerNed(fil, true);
      const formular = new FormData();
      formular.set("fil", new File([blob], "billede", { type: blob.type }));

      const svar = await lagDesignBilledeOp(formular);
      if (!svar.ok) {
        setFejl(svar.fejl);
        return;
      }

      const maal = await naturligStoerrelse(billedUrl(billedBase, svar.sti));
      const forhold = maal ? maal.b / maal.h : 4 / 3;

      const udskift = udskiftRef.current ? valgtElement : null;
      if (udskift && udskift.type === "billede") {
        // Rammen bliver, hvor den er; højden følger det nye billede.
        opdaterElement(udskift.id, { sti: svar.sti, h: udskift.b / forhold });
      } else {
        const b = forhold >= 1 ? 640 : 480 * forhold;
        const h = b / forhold;
        tilfoej({
          id: nytId(),
          type: "billede",
          x: (LAERRED_B - b) / 2,
          y: (LAERRED_H - h) / 2,
          b,
          h,
          sti: svar.sti,
          tilpasning: "fyld",
          radius: 0,
        });
      }
    } catch (err) {
      console.error("Upload af designbillede fejlede:", err);
      setFejl(err instanceof Error ? err.message : "Billedet kunne ikke lægges op. Prøv igen.");
    } finally {
      setLagerOp(false);
      if (filRef.current) filRef.current.value = "";
    }
  }

  async function originalProportion() {
    if (!valgtElement || valgtElement.type !== "billede") return;
    const maal = await naturligStoerrelse(billedUrl(billedBase, valgtElement.sti));
    if (maal) opdaterElement(valgtElement.id, { h: valgtElement.b / (maal.b / maal.h) });
  }

  // ---------------------------------------------------------------------------
  // Gem
  // ---------------------------------------------------------------------------

  function gem(naesteAktiv = aktiv) {
    startTransition(async () => {
      try {
        const svar = await gemDesign(farve, design, naesteAktiv);
        if (svar.ok) {
          setFejl(null);
          setAktiv(naesteAktiv);
          setAendret(false);
          setBesked(naesteAktiv ? "Gemt og vist på skærmen ✓" : "Gemt ✓ (ikke vist på skærmen)");
        } else {
          setFejl(svar.fejl);
        }
      } catch (err) {
        console.error("Kald til gemDesign fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
      }
    });
  }

  function erstat(nyt: Design, spoergsmaal: string) {
    if (!window.confirm(spoergsmaal)) return;
    // Nye id'er, så en kopi fra en anden farve ikke deler id med originalen.
    aendre(() => ({ ...nyt, elementer: nyt.elementer.map((e) => ({ ...e, id: nytId() })) }));
    setValgt(null);
  }

  const vist = skala > 0;

  return (
    <div className="mt-6">
      {/* Værktøjslinje */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={KNAP}
          onClick={() =>
            tilfoej(nyTekst("Skriv din tekst her", LAERRED_B / 2 - 400, LAERRED_H / 2 - 60, 800, 120, {
              stoerrelse: 72,
              fed: true,
              justering: "midt",
            }))
          }
        >
          + Tekst
        </button>
        <button type="button" className={KNAP} disabled={lagerOp} onClick={() => vaelgBillede(false)}>
          {lagerOp ? "Lægger op…" : "+ Billede"}
        </button>
        <button
          type="button"
          className={KNAP}
          onClick={() =>
            tilfoej({
              id: nytId(),
              type: "boks",
              x: LAERRED_B / 2 - 300,
              y: LAERRED_H / 2 - 200,
              b: 600,
              h: 400,
              farve: "#FFFFFF",
              radius: 32,
              opacitet: 100,
            })
          }
        >
          + Felt
        </button>
        <button
          type="button"
          className={KNAP}
          onClick={() =>
            tilfoej({ id: nytId(), type: "billede", x: 1735, y: 22, b: 130, h: 130, sti: LOGO, tilpasning: "hele", radius: 0 })
          }
        >
          + Logo
        </button>

        <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden />

        <button type="button" className={KNAP} disabled={fortid.length === 0} onClick={fortryd} title="Ctrl/Cmd + Z">
          ↶ Fortryd
        </button>
        <button type="button" className={KNAP} disabled={fremtid.length === 0} onClick={gentag} title="Ctrl/Cmd + Shift + Z">
          ↷ Gentag
        </button>

        <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden />

        <button
          type="button"
          className={KNAP}
          onClick={() =>
            erstat(designFraKostplan(indhold), "Start forfra fra kostplanen? Det nuværende design bliver erstattet (du kan fortryde).")
          }
        >
          Start forfra
        </button>
        {andre.map((a) => (
          <button
            key={a.farve}
            type="button"
            className={KNAP}
            onClick={() =>
              erstat(a.design, `Kopiér det gemte design fra ${a.farve}? Det nuværende design bliver erstattet (du kan fortryde).`)
            }
          >
            Kopiér fra {a.farve}
          </button>
        ))}

        <input
          ref={filRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(ev) => {
            const fil = ev.target.files?.[0];
            if (fil) void billedeValgt(fil);
          }}
        />
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Lærredet */}
        <div>
          <div
            ref={setRamme}
            className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-slate-300 bg-slate-200 shadow-sm"
            style={{ height: vist ? LAERRED_H * skala : undefined, aspectRatio: vist ? undefined : "16 / 9" }}
            onPointerDown={() => setValgt(null)}
          >
            {vist && (
              <>
                <div className="pointer-events-none absolute left-0 top-0" style={{ width: LAERRED_B * skala, height: LAERRED_H * skala }}>
                  <DesignLaerred design={design} billedBase={billedBase} besked={EKSEMPEL_BESKED} skala={skala} />
                </div>

                {design.elementer.map((e) => {
                  const erValgt = e.id === valgt;
                  return (
                    <div
                      key={e.id}
                      role="button"
                      aria-label={navnPaa(e)}
                      aria-pressed={erValgt}
                      className={`absolute cursor-move ${erValgt ? "outline outline-2 outline-red-600" : "hover:outline hover:outline-1 hover:outline-red-400"}`}
                      style={{ left: e.x * skala, top: e.y * skala, width: e.b * skala, height: e.h * skala }}
                      onPointerDown={(ev) => begynd(ev, e, "flyt")}
                      onPointerMove={bevaeg}
                      onPointerUp={slip}
                      onPointerCancel={slip}
                      onDoubleClick={() => e.type === "tekst" && tekstRef.current?.focus()}
                    >
                      {erValgt &&
                        HAANDTAG.map((hd) => (
                          <div
                            key={hd.navn}
                            className="absolute z-10 h-3 w-3 rounded-sm border border-red-600 bg-white"
                            style={{
                              left: `calc(${hd.x * 100}% - 6px)`,
                              top: `calc(${hd.y * 100}% - 6px)`,
                              cursor: hd.cursor,
                            }}
                            onPointerDown={(ev) => begynd(ev, e, "stoerrelse", hd.h)}
                            onPointerMove={bevaeg}
                            onPointerUp={slip}
                            onPointerCancel={slip}
                          />
                        ))}
                    </div>
                  );
                })}

                {linjer.lodret.map((x) => (
                  <div key={`l${x}`} className="pointer-events-none absolute top-0 h-full w-px bg-fuchsia-500" style={{ left: x * skala }} />
                ))}
                {linjer.vandret.map((y) => (
                  <div key={`v${y}`} className="pointer-events-none absolute left-0 h-px w-full bg-fuchsia-500" style={{ top: y * skala }} />
                ))}
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Træk for at flytte, træk i hjørnerne for at ændre størrelse. Elementer klikker fast på
            midten og kanterne — hold Alt nede for at slippe fri. Pilene flytter det valgte
            element, Delete sletter det, og Ctrl/Cmd + D dublerer det.
          </p>
        </div>

        {/* Egenskaber */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {valgtElement ? (
            <ElementPanel
              element={valgtElement}
              tekstRef={tekstRef}
              opdater={(felter, samle) => opdaterElement(valgtElement.id, felter, samle)}
              onFlyt={(r) => flytLag(valgtElement.id, r)}
              onDupliker={() => dupliker(valgtElement.id)}
              onSlet={() => slet(valgtElement.id)}
              onUdskiftBillede={() => vaelgBillede(true)}
              onOriginalProportion={() => void originalProportion()}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-base font-bold text-slate-950">Skærmen</p>
              <FarveFelt
                navn="Baggrundsfarve"
                vaerdi={design.baggrund}
                onChange={(baggrund) => aendre((d) => ({ ...d, baggrund }), "baggrund")}
              />
              <p className="text-sm text-slate-600">
                Klik på et element på skærmen for at ændre det, eller vælg det i listen herunder.
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Lag <span className="font-normal normal-case tracking-normal">(øverst ligger forrest)</span>
            </p>
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {[...design.elementer].reverse().map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setValgt(e.id)}
                    className={`w-full truncate rounded-md px-2 py-1 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 ${
                      e.id === valgt ? "bg-red-50 font-semibold text-red-800" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mr-1.5 text-xs text-slate-400">
                      {e.type === "tekst" ? "T" : e.type === "billede" ? "▣" : "■"}
                    </span>
                    {navnPaa(e)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Gem */}
      <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            className="h-4 w-4 accent-red-700"
            checked={aktiv}
            onChange={(ev) => {
              setAktiv(ev.target.checked);
              setAendret(true);
              setBesked(null);
            }}
          />
          Vis dette design på skærmen på {farve.toLowerCase()} dage
        </label>

        <button
          type="button"
          onClick={() => gem()}
          disabled={isPending}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          {isPending ? "Gemmer…" : `Gem ${farve}`}
        </button>

        <span aria-live="polite" className="text-sm text-slate-600">
          {besked ?? (aendret ? "Ikke gemt" : "")}
        </span>

        {fejl && (
          <p role="alert" className="w-full text-sm font-semibold text-red-700">
            {fejl}
          </p>
        )}
      </div>
    </div>
  );
}
