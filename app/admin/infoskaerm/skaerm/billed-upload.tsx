"use client";

import { useRef, useState, useTransition } from "react";
import { skalerNed } from "@/lib/infoskaerm/skaler-billede";
import { lagBilledOp } from "./actions";

const FELT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700";

const ETIKET = "block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

export default function BilledUpload() {
  const filRef = useRef<HTMLInputElement>(null);
  const [tekst, setTekst] = useState("");
  const [visDato, setVisDato] = useState("");
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);
  const [isPending, startTransition] = useTransition();

  function lagOp() {
    const fil = filRef.current?.files?.[0];

    if (!fil) {
      setFejl("Vælg et billede.");
      return;
    }

    startTransition(async () => {
      try {
        const blob = await skalerNed(fil);

        const formular = new FormData();
        formular.set("fil", new File([blob], "billede.jpg", { type: "image/jpeg" }));
        formular.set("tekst", tekst);
        formular.set("visDato", visDato);

        const svar = await lagBilledOp(formular);

        if (svar.ok) {
          setFejl(null);
          setGemt(true);
          setTekst("");
          setVisDato("");
          if (filRef.current) filRef.current.value = "";
        } else {
          setFejl(svar.fejl);
          setGemt(false);
        }
      } catch (err) {
        console.error("Upload af billede fejlede:", err);
        setFejl(err instanceof Error ? err.message : "Serveren svarede ikke. Prøv igen.");
        setGemt(false);
      }
    });
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-950">Læg et billede op</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className={ETIKET}>Billede</span>
          <input
            ref={filRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={() => setGemt(false)}
            className="mt-1.5 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-red-700 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-800"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={ETIKET}>Tekst under billedet (valgfri)</span>
          <input
            className={`${FELT} mt-1.5`}
            value={tekst}
            maxLength={200}
            placeholder="Fx Dagens ret: kylling med ris"
            onChange={(e) => setTekst(e.target.value)}
          />
        </label>

        <label className="block">
          <span className={ETIKET}>Kun denne dag (valgfri)</span>
          <input
            type="date"
            className={`${FELT} mt-1.5`}
            value={visDato}
            onChange={(e) => setVisDato(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={lagOp}
          disabled={isPending}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          {isPending ? "Lægger op…" : "Læg op"}
        </button>
        <span aria-live="polite" className="text-sm text-slate-600">
          {gemt ? "Lagt op ✓" : ""}
        </span>
      </div>

      {fejl && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {fejl}
        </p>
      )}
    </div>
  );
}
