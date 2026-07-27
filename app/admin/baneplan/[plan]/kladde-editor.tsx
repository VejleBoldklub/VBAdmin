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
  const [ikrafttraedelsesdato, setIkrafttraedelsesdato] = useState("");
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
      setFejl("Opret mindst én bane, før du tilføjer en tildeling.");
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
    if (!ikrafttraedelsesdato) {
      setFejl("Angiv en ikrafttrædelsesdato før publicering.");
      return;
    }
    setArbejder(true);
    try {
      await gemKladde(kladdeId, slug, saesontitel, fields, events);
      await publicerKladde(kladdeId, slug, ikrafttraedelsesdato);
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
        Ændringer her påvirker ikke den
