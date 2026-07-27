"use client";

import { useState } from "react";
import type { PlanSlug } from "@/features/baneplan/plans";
import type { Tildeling } from "@/features/baneplan/types";
import { gemKladde, publicerKladde, kasserKladde } from "@/features/baneplan/actions";

const DAGE = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

const TOM_RAEKKE: Tildeling = {
  bane: "",
  dag: "Mandag",
  starttid: "16:00",
  sluttid: "17:00",
  hold: "",
};

type KladdeEditorProps = {
  kladdeId: string;
  slug: PlanSlug;
  initialSaesontitel: string;
  initialTildelinger: Tildeling[];
};

export default function KladdeEditor({
  kladdeId,
  slug,
  initialSaesontitel,
  initialTildelinger,
}: KladdeEditorProps) {
  const [saesontitel, setSaesontitel] = useState(initialSaesontitel);
  const [rows, setRows] = useState<Tildeling[]>(
    initialTildelinger.length > 0 ? initialTildelinger : [{ ...TOM_RAEKKE }]
  );
  const [ikrafttraedelsesdato, setIkrafttraedelsesdato] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [arbejder, setArbejder] = useState(false);

  function opdaterRaekke(index: number, felt: keyof Tildeling, vaerdi: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [felt]: vaerdi } : r)));
  }

  function tilfoejRaekke() {
    setRows((prev) => [...prev, { ...TOM_RAEKKE }]);
  }

  function fjernRaekke(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGem() {
    setFejl(null);
    setArbejder(true);
    try {
      await gemKladde(kladdeId, slug, saesontitel, rows);
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
      await gemKladde(kladdeId, slug, saesontitel, rows);
      await publicerKladde(kladdeId, slug, ikrafttraedelsesdato);
      setStatus("Planen er publiceret og er nu den offentlige, gældende plan.");
    } catch (e) {
      setFejl(e instanceof Error ? e.message : "Kunne ikke publicere kladden.");
    } finally {
      setArbejder(false);
    }
  }

  async function handleKasser() {
    if (!confirm("Er du sikker på, at du vil kassere denne kladde? Ændringerne kan ikke fortrydes.")) {
      return;
    }
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
        Ændringer her påvirker ikke den offentlige plan, før du publicerer.
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

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-bold uppercase text-slate-500">Bane</th>
              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-bold uppercase text-slate-500">Dag</th>
              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-bold uppercase text-slate-500">Start</th>
              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-bold uppercase text-slate-500">Slut</th>
              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-bold uppercase text-slate-500">Hold</th>
              <th className="border-b-2 border-slate-200 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    value={row.bane}
                    onChange={(e) => opdaterRaekke(index, "bane", e.target.value)}
                    placeholder="Bane 1"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <select
                    value={row.dag}
                    onChange={(e) => opdaterRaekke(index, "dag", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                  >
                    {DAGE.map((dag) => (
                      <option key={dag} value={dag}>
                        {dag}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    type="time"
                    value={row.starttid}
                    onChange={(e) => opdaterRaekke(index, "starttid", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    type="time"
                    value={row.sluttid}
                    onChange={(e) => opdaterRaekke(index, "sluttid", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5">
                  <input
                    value={row.hold}
                    onChange={(e) => opdaterRaekke(index, "hold", e.target.value)}
                    placeholder="U15 Drenge"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                  />
                </td>
                <td className="border-b border-slate-100 p-1.5 text-right">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => fjernRaekke(index)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      Fjern
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={tilfoejRaekke}
        className="mt-3 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        + Tilføj tildeling
      </button>

      <hr className="my-6 border-slate-200" />

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold text-slate-700">
          Ikrafttrædelsesdato
          <input
            type="date"
            value={ikrafttraedelsesdato}
            onChange={(e) => setIkrafttraedelsesdato(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          />
        </label>
      </div>

      {fejl && <p className="mt-4 text-sm font-semibold text-red-700">{fejl}</p>}
      {status && !fejl && <p className="mt-4 text-sm font-semibold text-emerald-700">{status}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGem}
          disabled={arbejder}
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50"
        >
          Gem kladde
        </button>
        <button
          type="button"
          onClick={handlePublicer}
          disabled={arbejder}
          className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Publicér som live-plan
        </button>
        <button
          type="button"
          onClick={handleKasser}
          disabled={arbejder}
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50"
        >
          Kassér kladde
        </button>
      </div>
    </div>
  );
}
