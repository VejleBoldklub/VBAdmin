"use client";

import { useState } from "react";
import type { PlanSlug } from "@/features/baneplan/plans";
import { CATEGORIES, DAGE, type Category, type ScheduleEvent, type ScheduleField } from "@/features/baneplan/types";
import { gemKladde, publicerKladde, kasserKladde } from "@/features/baneplan/actions";
import ScheduleView from "./schedule-view";

type KladdeEditorProps = {
  kladdeId: string;
  slug: PlanSlug;
  initialSaesontitel: string;
  initialFields: ScheduleField[];
  initialEvents: ScheduleEvent[];
};

function nytId() {
  return `e${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export default function KladdeEditor({
  kladdeId,
  slug,
  initialSaesontitel,
  initialFields,
  initialEvents,
}: KladdeEditorProps) {
  const [saesontitel, setSaesontitel] = useState(initialSaesontitel);
  const [fields, setFields] = useState<ScheduleField[]>(initialFields);
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [status, setStatus] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [arbejder, setArbejder] = useState(false);

  function tilfoejBane() {
    const navn = prompt("Navn på ny bane (fx 'Bane 12'):");
    if (!navn) return;
    setFields((prev) => [...prev, { name: navn }]);
  }

  function fjernBane(navn: string) {
    if (!confirm(`Fjern "${navn}"? Alle tildelinger på denne bane fjernes også.`)) return;
    setFields((prev) => prev.filter((f) => f.name !== navn));
    setEvents((prev) => prev.filter((e) => e.field !== navn));
  }

  function tilfoejEvent() {
    if (fields.length === 0) {
      setFejl("Opret mindst en bane, før du tilføjer en tildeling.");
      return;
    }
    setEvents((prev) => [
      ...prev,
      {
        id: nytId(),
        day: "Mandag",
        team: "",
        start: 16 * 60,
        end: 17 * 60,
        field: fields[0].name,
        room: "",
        category: "piger",
      },
    ]);
  }

  function opdaterEvent(id: string, felt: keyof ScheduleEvent, vaerdi: string | number) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [felt]: vaerdi } : e)));
  }

  function fjernEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function tidTilMinutter(tekst: string): number {
    const [t, m] = tekst.split(":").map(Number);
    return (t || 0) * 60 + (m || 0);
  }

  function minutterTilTid(min: number): string {
    const t = Math.floor(min / 60);
    const m = min % 60;
    return `${String(t).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  async function handleGem() {
    setFejl(null);
    setArbejder(true);
    try {
      await gemKladde(kladdeId, slug, saesontitel, fields, events);
      setStatus("Kladden er gemt.");
    } catch (e) {
      setFejl(e instanceof Error ? e.message : "Kunne ikke gemme kladden.");
    } finally {
      setArbejder(false);
    }
  }

  async function handlePublicer() {
    setFejl(null);
    setArbejder(true);
    try {
      await gemKladde(kladdeId, slug, saesontitel, fields, events);
      await publicerKladde(kladdeId, slug);
      setStatus("Planen er publiceret og er nu den offentlige, gældende plan.");
    } catch (e) {
      setFejl(e instanceof Error ? e.message : "Kunne ikke publicere kladden.");
    } finally {
      setArbejder(false);
    }
  }

  async function handleKasser() {
    if (!confirm("Er du sikker på, at du vil kassere denne kladde?")) return;
    setArbejder(true);
    try {
      await kasserKladde(kladdeId, slug);
    } catch (e) {
      setFejl(e instanceof Error ? e.message : "Kunne ikke kassere kladden.");
      setArbejder(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950">Kladde (sandkasse)</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
          Kladde
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Ændringer her påvirker ikke den offentlige plan, før du publicerer. Forhåndsvisningen nedenfor viser,
        hvordan planen kommer til at se ud.
      </p>

      <div className="mt-5">
        <label className="block text-sm font-semibold text-slate-700">
          Sæsontitel
          <input
            value={saesontitel}
            onChange={(e) => setSaesontitel(e.target.value)}
            placeholder="Efterår '26 / Forår '27"
            className="mt-1 block w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          />
        </label>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Baner</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {fields.map((f) => (
            <span
              key={f.name}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {f.name}
              <button type="button" onClick={() => fjernBane(f.name)} className="text-slate-400 hover:text-red-700">
                x
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={tilfoejBane}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            + Tilføj bane
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Tildelinger</h3>
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              {["Hold", "Bane", "Dag", "Start", "Slut", "Omkl.", "Kategori", ""].map((th) => (
                <th key={th} className="border-b-2 border-slate-200 p-2 text-left text-xs font-bold uppercase text-slate-500">
                  {th}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    value={ev.team}
                    onChange={(e) => opdaterEvent(ev.id, "team", e.target.value)}
                    placeholder="U15 Drenge"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <select
                    value={ev.field}
                    onChange={(e) => opdaterEvent(ev.id, "field", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                  >
                    {fields.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <select
                    value={ev.day}
                    onChange={(e) => opdaterEvent(ev.id, "day", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                  >
                    {DAGE.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    type="time"
                    value={minutterTilTid(ev.start)}
                    onChange={(e) => opdaterEvent(ev.id, "start", tidTilMinutter(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    type="time"
                    value={minutterTilTid(ev.end)}
                    onChange={(e) => opdaterEvent(ev.id, "end", tidTilMinutter(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    value={ev.room ?? ""}
                    onChange={(e) => opdaterEvent(ev.id, "room", e.target.value)}
                    placeholder="-"
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <select
                    value={ev.category}
                    onChange={(e) => opdaterEvent(ev.id, "category", e.target.value as Category)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-slate-100 p-1.5 text-right">
                  <button type="button" onClick={() => fjernEvent(ev.id)} className="text-xs font-semibold text-slate-500 hover:text-red-700">
                    Fjern
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={tilfoejEvent}
          className="mt-3 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Tilføj tildeling
        </button>
      </div>

      {fields.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Forhåndsvisning</h3>
          <ScheduleView fields={fields} events={events} />
        </div>
      )}

      <hr className="my-6 border-slate-200" />

      {fejl && <p className="mt-4 text-sm font-semibold text-red-700">{fejl}</p>}
      {status && !fejl && <p className="mt-4 text-sm font-semibold text-emerald-700">{status}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGem}
          disabled={arbejder}
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Gem kladde
        </button>
        <button
          type="button"
          onClick={handlePublicer}
          disabled={arbejder}
          className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
        >
          Publicer som live-plan
        </button>
        <button
          type="button"
          onClick={handleKasser}
          disabled={arbejder}
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Kasser kladde
        </button>
      </div>
    </div>
  );
}
