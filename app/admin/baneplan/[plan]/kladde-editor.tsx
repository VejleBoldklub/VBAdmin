"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanSlug } from "@/features/baneplan/plans";
import type { Maaltavle, ScheduleEvent, ScheduleField } from "@/features/baneplan/types";
import { gemKladde, publicerKladde, kasserKladde } from "@/features/baneplan/actions";
import BaneTags from "./bane-tags";
import MaaltavleEditor from "./maaltavle-editor";
import ScheduleEditor from "./schedule-editor";

type KladdeEditorProps = {
  kladdeId: string;
  slug: PlanSlug;
  initialSaesontitel: string;
  initialFields: ScheduleField[];
  initialEvents: ScheduleEvent[];
  initialMaaltavle: Maaltavle | undefined;
};

type GemStatus = "gemt" | "ugemt" | "gemmer" | "fejl";

// Hvor længe der ventes efter sidste ændring, før kladden gemmes. Kort nok til
// at arbejde ikke kan tabes ved et uheld, langt nok til at et træk med mange
// mellemtrin kun udløser én gemning.
const AUTOSAVE_MS = 1000;

export default function KladdeEditor({
  kladdeId,
  slug,
  initialSaesontitel,
  initialFields,
  initialEvents,
  initialMaaltavle,
}: KladdeEditorProps) {
  const [saesontitel, setSaesontitel] = useState(initialSaesontitel);
  const [fields, setFields] = useState<ScheduleField[]>(initialFields);
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [maaltavle, setMaaltavle] = useState<Maaltavle | undefined>(initialMaaltavle);
  const [gemStatus, setGemStatus] = useState<GemStatus>("gemt");
  const [sidstGemt, setSidstGemt] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [arbejder, setArbejder] = useState(false);

  // Revisionstæller, så en gemning, der bliver overhalet af nye ændringer, ikke
  // melder "Gemt" for noget, der endnu ikke er sendt afsted.
  const revision = useRef(0);

  function markerAendret() {
    revision.current += 1;
    setGemStatus("ugemt");
  }

  const gem = useCallback(async () => {
    const rev = revision.current;
    setGemStatus("gemmer");
    try {
      await gemKladde(kladdeId, saesontitel, { fields, events, maaltavle });
      setFejl(null);
      setSidstGemt(new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }));
      // Kom der ændringer, mens vi gemte, er kladden stadig ugemt.
      setGemStatus(revision.current === rev ? "gemt" : "ugemt");
    } catch (e) {
      setGemStatus("fejl");
      setFejl(e instanceof Error ? e.message : "Kunne ikke gemme kladden.");
    }
  }, [kladdeId, saesontitel, fields, events, maaltavle]);

  // Autosave. Nulstilles ved hver ændring, så et træk kun gemmer én gang.
  useEffect(() => {
    if (gemStatus !== "ugemt") return;
    const t = setTimeout(() => {
      void gem();
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [gemStatus, gem]);

  // Advar hvis fanen lukkes med ugemte ændringer.
  useEffect(() => {
    if (gemStatus === "gemt") return;
    function advar(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", advar);
    return () => window.removeEventListener("beforeunload", advar);
  }, [gemStatus]);

  function tilfoejBane() {
    const navn = prompt("Navn på ny bane (fx 'Bane 12'):");
    if (!navn) return;
    if (fields.some((f) => f.name === navn)) {
      setFejl(`Der findes allerede en bane med navnet "${navn}".`);
      return;
    }
    setFields((prev) => [...prev, { name: navn }]);
    markerAendret();
  }

  function fjernBane(navn: string) {
    if (!confirm(`Fjern "${navn}"? Alle tildelinger på denne bane fjernes også.`)) return;
    setFields((prev) => prev.filter((f) => f.name !== navn));
    setEvents((prev) => prev.filter((e) => e.field !== navn));
    markerAendret();
  }

  // Tildelinger peger på deres bane ved navn, så de skal ikke rettes med, når
  // banerne bytter plads — kun listen selv ændrer sig.
  function omrokerBaner(naeste: ScheduleField[]) {
    setFields(naeste);
    markerAendret();
  }

  function opdaterEvents(naeste: ScheduleEvent[]) {
    setEvents(naeste);
    markerAendret();
  }

  async function handlePublicer() {
    setFejl(null);
    setArbejder(true);
    try {
      await gemKladde(kladdeId, saesontitel, { fields, events, maaltavle });
      setGemStatus("gemt");
      await publicerKladde(kladdeId, slug);
    } catch (e) {
      setFejl(e instanceof Error ? e.message : "Kunne ikke publicere kladden.");
      setArbejder(false);
    }
  }

  async function handleKasser() {
    if (!confirm("Er du sikker på, at du vil kassere denne kladde?")) return;
    setArbejder(true);
    // Kladden forsvinder, så ugemte ændringer skal ikke udløse en advarsel.
    setGemStatus("gemt");
    try {
      await kasserKladde(kladdeId, slug);
    } catch (e) {
      setFejl(e instanceof Error ? e.message : "Kunne ikke kassere kladden.");
      setArbejder(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-950">Kladde (sandkasse)</h2>
        <div className="flex items-center gap-2">
          <GemBadge status={gemStatus} sidstGemt={sidstGemt} />
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
            Kladde
          </span>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Ændringer her påvirker ikke den offentlige plan, før du publicerer. Kladden gemmes
        automatisk, mens du arbejder.
      </p>

      <div className="mt-5">
        <label className="block text-sm font-semibold text-slate-700">
          Sæsontitel
          <input
            value={saesontitel}
            onChange={(e) => {
              setSaesontitel(e.target.value);
              markerAendret();
            }}
            placeholder="Efterår '26 / Forår '27"
            className="mt-1 block w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          />
        </label>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Baner</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Rækkefølgen her bestemmer kolonnernes rækkefølge i skemaet — også på den offentlige plan,
          når kladden publiceres. Træk en bane for at flytte den, eller flyt den med venstre og højre
          piletast.
        </p>
        <BaneTags
          fields={fields}
          onOmroker={omrokerBaner}
          onFjern={fjernBane}
          onTilfoej={tilfoejBane}
        />
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Tildelinger</h3>
        <ScheduleEditor fields={fields} events={events} onChange={opdaterEvents} />
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Måloversigt
        </h3>
        <MaaltavleEditor
          maaltavle={maaltavle}
          fields={fields}
          onChange={(naeste) => {
            setMaaltavle(naeste);
            markerAendret();
          }}
        />
      </div>

      <hr className="my-6 border-slate-200" />

      {fejl && <p className="mb-4 text-sm font-semibold text-red-700">{fejl}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void gem()}
          disabled={arbejder || gemStatus === "gemmer"}
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Gem nu
        </button>
        <button
          type="button"
          onClick={handlePublicer}
          disabled={arbejder}
          className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          Publicer som live-plan
        </button>
        <button
          type="button"
          onClick={handleKasser}
          disabled={arbejder}
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Kasser kladde
        </button>
      </div>
    </div>
  );
}

function GemBadge({ status, sidstGemt }: { status: GemStatus; sidstGemt: string | null }) {
  const tekst =
    status === "gemmer"
      ? "Gemmer…"
      : status === "ugemt"
        ? "Ikke gemt"
        : status === "fejl"
          ? "Kunne ikke gemme"
          : sidstGemt
            ? `Gemt kl. ${sidstGemt}`
            : "Gemt";

  const farve =
    status === "fejl"
      ? "bg-red-100 text-red-800"
      : status === "ugemt"
        ? "bg-slate-100 text-slate-600"
        : status === "gemmer"
          ? "bg-sky-100 text-sky-800"
          : "bg-emerald-100 text-emerald-800";

  return (
    <span
      role="status"
      aria-live="polite"
      className={`rounded-full px-3 py-1 text-xs font-semibold ${farve}`}
    >
      {tekst}
    </span>
  );
}
