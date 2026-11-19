"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { lavSlug } from "@/lib/signage/typer";
import { opretSkaerm } from "./actions";
import { ETIKET, FELT, KNAP_ROED } from "./ui";

export default function NySkaerm() {
  const router = useRouter();
  const [navn, setNavn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugRoert, setSlugRoert] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function gem(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const svar = await opretSkaerm(navn, slug);
      if (svar.ok) router.push(`/admin/signage/skaerm/${svar.data}`);
      else setFejl(svar.fejl);
    });
  }

  return (
    <form onSubmit={gem} className="grid gap-3">
      <label className="block">
        <span className={ETIKET}>Navn</span>
        <input
          className={`${FELT} mt-1`}
          value={navn}
          placeholder="fx Klubhus indgang"
          onChange={(e) => {
            setNavn(e.target.value);
            if (!slugRoert) setSlug(lavSlug(e.target.value));
          }}
          required
          maxLength={80}
        />
      </label>
      <label className="block">
        <span className={ETIKET}>Adresse</span>
        <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
          <span>/signage/</span>
          <input
            className={FELT}
            value={slug}
            onChange={(e) => {
              setSlugRoert(true);
              setSlug(e.target.value.toLowerCase());
            }}
            required
            maxLength={50}
            pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
          />
        </div>
      </label>
      {fejl && <p className="text-sm text-red-300">{fejl}</p>}
      <button type="submit" disabled={isPending} className={KNAP_ROED}>
        {isPending ? "Opretter …" : "＋ Tilføj skærm"}
      </button>
    </form>
  );
}
