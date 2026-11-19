"use client";

import { useState } from "react";

// Player-URL'en med en kopiknap. Falder tilbage til at markere feltet, hvis
// browseren ikke vil kopiere — samme fremgangsmåde som infoskærmens kiosklink.
export default function KopierFelt({ url, etiket = "Player-URL" }: { url: string; etiket?: string }) {
  const [tilstand, setTilstand] = useState<"klar" | "kopieret" | "marker">("klar");

  async function kopier(felt: HTMLInputElement | null) {
    try {
      await navigator.clipboard.writeText(url);
      setTilstand("kopieret");
    } catch {
      felt?.select();
      setTilstand("marker");
    }
    window.setTimeout(() => setTilstand("klar"), 2500);
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        readOnly
        value={url}
        aria-label={etiket}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-[#2a3a5c] bg-[#0a1324] px-3 py-2 font-mono text-xs text-slate-200"
      />
      <button
        type="button"
        onClick={(e) => kopier(e.currentTarget.previousElementSibling as HTMLInputElement)}
        className="whitespace-nowrap rounded-lg border border-[#2a3a5c] bg-[#14223d] px-3 py-2 text-xs font-semibold text-white hover:border-slate-400"
      >
        {tilstand === "kopieret" ? "Kopieret!" : tilstand === "marker" ? "Tryk Ctrl+C" : "Kopiér"}
      </button>
    </div>
  );
}
