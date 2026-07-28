"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  DAGE,
  minutesToLabel,
  type Category,
  type ScheduleEvent,
  type ScheduleField,
} from "@/features/baneplan/types";
import {
  aendreVarighed,
  ALL_ROOMS,
  flytTidsrum,
  HEADER_H,
  layoutEvents,
  MIN_DURATION,
  MIN_FIELD_W,
  pickInitialDay,
  rangeForDay,
  ROW_H,
  SNAP,
  snapTilKvarter,
  tilpasTilDag,
  TIME_W,
} from "@/features/baneplan/layout";
import CategoryMenu from "./category-menu";
import EventBox, { type DragKind } from "./event-box";

type ScheduleEditorProps = {
  fields: ScheduleField[];
  events: ScheduleEvent[];
  onChange: (events: ScheduleEvent[]) => void;
};

type LaneRect = { name: string; left: number; right: number };
type TabRect = { day: string; left: number; right: number; top: number; bottom: number };

// Foreløbig placering under et træk. Lægges oven på de rigtige data, så
// kolonneopdelingen genberegnes løbende og boksene flytter sig for hinanden.
type Preview = { id: string; start: number; end: number; field: string };

// Igangværende oprettelse ved træk på tomt gitter.
type NyBoks = { field: string; start: number; end: number };

function nytId() {
  return `e${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export default function ScheduleEditor({ fields, events, onChange }: ScheduleEditorProps) {
  const [activeDay, setActiveDay] = useState<string>(() => pickInitialDay(DAGE));
  const [valgt, setValgt] = useState<string | null>(null);
  const [traekkerId, setTraekkerId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [maalDag, setMaalDag] = useState<string | null>(null);
  const [nyBoks, setNyBoks] = useState<NyBoks | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const laneRefs = useRef(new Map<string, HTMLDivElement>());

  const range = useMemo(() => rangeForDay(activeDay), [activeDay]);
  const ppm = ROW_H / 15;
  const bodyH = (range.max - range.min) * ppm;

  const patch = useCallback(
    (id: string, p: Partial<ScheduleEvent>) => {
      onChange(events.map((e) => (e.id === id ? { ...e, ...p } : e)));
    },
    [events, onChange]
  );

  const slet = useCallback(
    (id: string) => {
      onChange(events.filter((e) => e.id !== id));
      setValgt((v) => (v === id ? null : v));
      setMenu(null);
    },
    [events, onChange]
  );

  const opret = useCallback(
    (field: string, start: number, end: number) => {
      const ny: ScheduleEvent = {
        id: nytId(),
        day: activeDay,
        team: "",
        start,
        end,
        field,
        room: "",
        category: "piger",
      };
      onChange([...events, ny]);
      setValgt(ny.id);
    },
    [activeDay, events, onChange]
  );

  function dupliker(id: string) {
    const kilde = events.find((e) => e.id === id);
    if (!kilde) return;
    const varighed = kilde.end - kilde.start;
    // Læg kopien lige under originalen, hvis der er plads i dagens vindue.
    // Ellers oven i den, hvor kolonneopdelingen viser begge side om side.
    const passer = kilde.end + varighed <= rangeForDay(kilde.day).max;
    const start = passer ? kilde.end : kilde.start;
    onChange([...events, { ...kilde, id: nytId(), start, end: start + varighed }]);
    setMenu(null);
  }

  // Kolonnernes bredde er fraktionel, så den kan ikke udregnes af MIN_FIELD_W.
  // Rects måles ved pointerdown; de flytter sig ikke undervejs i et træk.
  function maalLanes(): LaneRect[] {
    return fields.map((f) => {
      const r = laneRefs.current.get(f.name)?.getBoundingClientRect();
      return { name: f.name, left: r?.left ?? 0, right: r?.right ?? 0 };
    });
  }

  function maalTabs(): TabRect[] {
    const rod = tabsRef.current;
    if (!rod) return [];
    return Array.from(rod.querySelectorAll<HTMLElement>("[data-dag]")).map((el) => {
      const r = el.getBoundingClientRect();
      return { day: el.dataset.dag ?? "", left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
  }

  function baneUnder(x: number, lanes: LaneRect[], fallback: string): string {
    if (lanes.length === 0) return fallback;
    if (x < lanes[0].left) return lanes[0].name;
    const sidste = lanes[lanes.length - 1];
    if (x >= sidste.right) return sidste.name;
    return lanes.find((l) => x >= l.left && x < l.right)?.name ?? fallback;
  }

  function dagUnder(x: number, y: number, tabs: TabRect[]): string | null {
    const t = tabs.find((t) => x >= t.left && x < t.right && y >= t.top && y < t.bottom);
    return t ? t.day : null;
  }

  // Træk og ændring af varighed. Lytterne sættes på window her frem for i en
  // effekt, så de ikke skal afmeldes og genoprettes ved hver bevægelse. Alt hvad
  // handleren har brug for, ligger i closuren og kan derfor ikke blive forældet.
  function startTraek(e: PointerEvent<HTMLDivElement>, ev: ScheduleEvent, kind: DragKind) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    setValgt(ev.id);
    setMenu(null);
    setTraekkerId(ev.id);

    const lanes = maalLanes();
    const tabs = maalTabs();
    const startY = e.clientY;
    const dagVedStart = activeDay;
    let sidste: Preview | null = null;
    let sidsteDag: string | null = null;

    function flyt(pe: globalThis.PointerEvent) {
      const dMin = (pe.clientY - startY) / ppm;
      if (kind === "move") {
        sidste = {
          id: ev.id,
          ...flytTidsrum(ev, dMin, range),
          field: baneUnder(pe.clientX, lanes, ev.field),
        };
        sidsteDag = dagUnder(pe.clientX, pe.clientY, tabs);
        setMaalDag(sidsteDag);
      } else {
        const kant = kind === "resize-bottom" ? "bottom" : "top";
        sidste = { id: ev.id, ...aendreVarighed(ev, dMin, kant, range), field: ev.field };
      }
      setPreview(sidste);
    }

    function afslut(gem: boolean) {
      window.removeEventListener("pointermove", flyt);
      window.removeEventListener("pointerup", slip);
      window.removeEventListener("pointercancel", annuller);
      setPreview(null);
      setTraekkerId(null);
      setMaalDag(null);
      if (!gem || !sidste) return;
      if (sidsteDag && sidsteDag !== dagVedStart) {
        patch(ev.id, { ...tilpasTilDag(sidste, sidsteDag), field: sidste.field, day: sidsteDag });
      } else {
        patch(ev.id, { start: sidste.start, end: sidste.end, field: sidste.field });
      }
    }

    const slip = () => afslut(true);
    const annuller = () => afslut(false);

    window.addEventListener("pointermove", flyt);
    window.addEventListener("pointerup", slip);
    window.addEventListener("pointercancel", annuller);
  }

  function startOpret(e: PointerEvent<HTMLDivElement>, fieldName: string) {
    // Kun træk på selve banefeltet, ikke på en boks ovenpå.
    if (e.target !== e.currentTarget) return;
    setValgt(null);
    setMenu(null);
    // På touch er træk browserens til at scrolle med. Ville vi også oprette ved
    // træk her, mistede man den vandrette scroll i gitteret. Touch bruger
    // knappen "Tilføj tildeling" i stedet.
    if (e.pointerType === "touch") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const laneTop = e.currentTarget.getBoundingClientRect().top;
    const fraMin = snapTilKvarter(range.min + (e.clientY - laneTop) / ppm);
    let sidste: NyBoks = { field: fieldName, start: fraMin, end: fraMin + MIN_DURATION };
    setNyBoks(sidste);

    function flyt(pe: globalThis.PointerEvent) {
      const nu = snapTilKvarter(range.min + (pe.clientY - laneTop) / ppm);
      const start = Math.max(range.min, Math.min(fraMin, nu));
      const slut = Math.min(range.max, Math.max(fraMin, nu));
      sidste = { field: fieldName, start, end: Math.max(slut, start + MIN_DURATION) };
      setNyBoks(sidste);
    }

    function afslut(gem: boolean) {
      window.removeEventListener("pointermove", flyt);
      window.removeEventListener("pointerup", slip);
      window.removeEventListener("pointercancel", annuller);
      setNyBoks(null);
      if (gem && sidste.end - sidste.start >= MIN_DURATION) {
        opret(sidste.field, sidste.start, sidste.end);
      }
    }

    const slip = () => afslut(true);
    const annuller = () => afslut(false);

    window.addEventListener("pointermove", flyt);
    window.addEventListener("pointerup", slip);
    window.addEventListener("pointercancel", annuller);
  }

  function taster(e: KeyboardEvent<HTMLDivElement>, ev: ScheduleEvent) {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      slet(ev.id);
      return;
    }
    if (e.key === "k" || e.key === "K") {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      setMenu({ id: ev.id, x: r.right, y: r.top });
      return;
    }
    if (!e.key.startsWith("Arrow")) return;
    e.preventDefault();

    const ned = e.key === "ArrowDown";
    const op = e.key === "ArrowUp";
    const hoj = e.key === "ArrowRight";
    const ven = e.key === "ArrowLeft";

    // Samme funktioner som ved træk, så tastatur og mus opfører sig ens.
    if (e.shiftKey && (op || ned)) {
      patch(ev.id, aendreVarighed(ev, ned ? SNAP : -SNAP, "bottom", range));
      return;
    }
    if (op || ned) {
      patch(ev.id, flytTidsrum(ev, ned ? SNAP : -SNAP, range));
      return;
    }
    if (e.altKey && (ven || hoj)) {
      const i = fields.findIndex((f) => f.name === ev.field);
      const nyI = Math.max(0, Math.min(fields.length - 1, i + (hoj ? 1 : -1)));
      patch(ev.id, { field: fields[nyI].name });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (ven || hoj)) {
      const i = DAGE.indexOf(ev.day);
      const nyDag = DAGE[Math.max(0, Math.min(DAGE.length - 1, i + (hoj ? 1 : -1)))];
      patch(ev.id, { day: nyDag, ...tilpasTilDag(ev, nyDag) });
      setActiveDay(nyDag);
    }
  }

  const dagensEvents = useMemo(() => {
    const grundlag = preview
      ? events.map((e) =>
          e.id === preview.id ? { ...e, start: preview.start, end: preview.end, field: preview.field } : e
        )
      : events;
    return grundlag.filter((e) => e.day === activeDay && e.end > range.min && e.start < range.max);
  }, [events, preview, activeDay, range.min, range.max]);

  const freeRooms = useMemo(() => {
    const brugt = new Set(
      dagensEvents.map((e) => Number(String(e.room ?? "").trim())).filter((n) => Number.isFinite(n))
    );
    return ALL_ROOMS.filter((n) => !brugt.has(n));
  }, [dagensEvents]);

  const menuEvent = menu ? events.find((e) => e.id === menu.id) : undefined;

  // Timelinjerne ligger som baggrund frem for som elementer, så et gitter med
  // syv baner ikke koster hundredvis af noder. Forskydningen sikrer, at den
  // kraftige linje rammer hele timer, også når dagen starter 14.30.
  const timeForskydning = ((60 - (range.min % 60)) % 60) * ppm;
  const laneBaggrund = {
    backgroundImage:
      `repeating-linear-gradient(to bottom, #cbd5e1 0, #cbd5e1 1px, transparent 1px, transparent ${4 * ROW_H}px),` +
      `repeating-linear-gradient(to bottom, #eef2f6 0, #eef2f6 1px, transparent 1px, transparent ${ROW_H}px)`,
    backgroundPosition: `0 ${timeForskydning}px, 0 0`,
  };

  if (fields.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Opret mindst én bane, før du kan lægge tildelinger ind.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-slate-500">
          Træk en boks for at flytte den, træk i kanten for at ændre varighed, og træk hen på en
          dagsfane for at flytte til en anden dag. Klik i teksten for at rette holdnavn og omklædning.
        </p>
        <button
          type="button"
          onClick={() => opret(fields[0].name, range.min + 60, range.min + 120)}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          + Tilføj tildeling
        </button>
      </div>

      <div ref={tabsRef} className="flex overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        {DAGE.map((day) => (
          <button
            key={day}
            type="button"
            data-dag={day}
            onClick={() => setActiveDay(day)}
            className={`flex-1 whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-xs font-bold uppercase tracking-wide last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 ${
              maalDag === day
                ? "bg-red-100 text-red-800 ring-2 ring-inset ring-red-700"
                : day === activeDay
                  ? "bg-red-700 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <div
          className="relative grid rounded-lg border border-slate-200 bg-white"
          style={{
            gridTemplateColumns: `${TIME_W}px repeat(${fields.length}, minmax(${MIN_FIELD_W}px, 1fr))`,
            gridTemplateRows: `${HEADER_H}px ${bodyH}px`,
            minWidth: TIME_W + fields.length * MIN_FIELD_W,
          }}
        >
          <div
            className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-slate-200 bg-red-700 text-sm font-bold text-white"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            TID
          </div>
          {fields.map((f, i) => (
            <div
              key={f.name}
              className="flex flex-col items-center justify-center border-b border-r border-slate-700 bg-slate-900 px-1 py-1 text-center text-white last:border-r-0"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <span className="text-sm font-bold leading-none">{f.name}</span>
              {f.type && <span className="mt-1 text-[10px] leading-none text-slate-300">({f.type})</span>}
            </div>
          ))}

          <div
            className="sticky left-0 z-10 border-r border-slate-200 bg-white"
            style={{ gridColumn: 1, gridRow: 2, height: bodyH }}
          >
            {Array.from({ length: Math.floor((range.max - range.min) / 15) + 1 }, (_, idx) => {
              const t = range.min + idx * 15;
              if (t === range.min || t === range.max) return null;
              const heleTimer = t % 60 === 0;
              return (
                <div
                  key={t}
                  className={`absolute left-0 right-0 flex h-4 -translate-y-1/2 items-center justify-center text-[11px] ${
                    heleTimer ? "font-bold text-red-700" : "text-slate-700"
                  }`}
                  style={{ top: (t - range.min) * ppm }}
                >
                  {minutesToLabel(t)}
                </div>
              );
            })}
          </div>

          {fields.map((f, i) => {
            const laneEvents = layoutEvents(dagensEvents.filter((e) => e.field === f.name));
            return (
              <div
                key={f.name}
                ref={(el) => {
                  if (el) laneRefs.current.set(f.name, el);
                  else laneRefs.current.delete(f.name);
                }}
                onPointerDown={(e) => startOpret(e, f.name)}
                className="relative border-r border-slate-200 last:border-r-0"
                style={{ gridColumn: i + 2, gridRow: 2, height: bodyH, ...laneBaggrund }}
              >
                {laneEvents.map((ev) => (
                  <EventBox
                    key={ev.id}
                    ev={ev}
                    top={(Math.max(ev.start, range.min) - range.min) * ppm + 3}
                    height={Math.max(
                      (Math.min(ev.end, range.max) - Math.max(ev.start, range.min)) * ppm - 6,
                      24
                    )}
                    leftPct={ev.col * (100 / ev.cols)}
                    widthPct={100 / ev.cols}
                    selected={valgt === ev.id}
                    dragging={traekkerId === ev.id}
                    onPointerDownBody={(e) => startTraek(e, ev, "move")}
                    onPointerDownResize={(e, kant) =>
                      startTraek(e, ev, kant === "top" ? "resize-top" : "resize-bottom")
                    }
                    onPatch={(p) => patch(ev.id, p)}
                    onOpenMenu={(x, y) => setMenu({ id: ev.id, x, y })}
                    onKeyDown={(e) => taster(e, ev)}
                  />
                ))}

                {nyBoks?.field === f.name && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-red-700 bg-red-50/70"
                    style={{
                      top: (nyBoks.start - range.min) * ppm + 3,
                      height: Math.max((nyBoks.end - nyBoks.start) * ppm - 6, 20),
                    }}
                  >
                    <span className="block pt-0.5 text-center text-[10px] font-bold text-red-800">
                      {minutesToLabel(nyBoks.start)}–{minutesToLabel(nyBoks.end)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <strong className="mr-2 text-slate-900">Ledige omkl.:</strong>
        <span className="font-semibold text-slate-900">
          {freeRooms.length > 0 ? freeRooms.join(" · ") : "Ingen"}
        </span>
      </div>

      {menu && menuEvent && (
        <CategoryMenu
          x={menu.x}
          y={menu.y}
          current={menuEvent.category}
          onPick={(kategori: Category) => {
            patch(menu.id, { category: kategori });
            setMenu(null);
          }}
          onDuplicate={() => dupliker(menu.id)}
          onDelete={() => slet(menu.id)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
