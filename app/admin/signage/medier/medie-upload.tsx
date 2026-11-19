"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MEDIE_MAKS_BYTES, MEDIE_TYPER } from "@/lib/signage/typer";
import { forberedUpload, registrerMedie } from "../actions";
import { KNAP_ROED } from "../ui";

// Filen sendes direkte fra browseren til Supabase Storage med en signeret
// upload-URL. En video er for stor til at gå gennem en server action.
function send(url: string, fil: File, onFremskridt: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", fil.type);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onFremskridt(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let besked = `HTTP ${xhr.status}`;
        try {
          besked = JSON.parse(xhr.responseText).message ?? besked;
        } catch {}
        if (xhr.status === 413 || /size|exceeded/i.test(besked)) {
          besked = "Filen er større end Supabase tillader. Hæv grænsen under Storage › Settings i Supabase, eller komprimér videoen.";
        }
        reject(new Error(besked));
      }
    };
    xhr.onerror = () => reject(new Error("Forbindelsen blev afbrudt."));
    xhr.send(fil);
  });
}

export default function MedieUpload() {
  const router = useRouter();
  const filRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [travl, setTravl] = useState(false);

  async function lagOp() {
    const filer = Array.from(filRef.current?.files ?? []);
    if (filer.length === 0) return setFejl("Vælg en eller flere filer.");

    setTravl(true);
    setFejl(null);

    for (const [i, fil] of filer.entries()) {
      const pre = filer.length > 1 ? `${i + 1}/${filer.length} · ` : "";
      try {
        if (!MEDIE_TYPER[fil.type]) throw new Error("Filtypen understøttes ikke. Brug JPEG, PNG, WebP, GIF, MP4 eller WebM.");
        if (fil.size > MEDIE_MAKS_BYTES) throw new Error("Filen er større end 500 MB.");

        setStatus(`${pre}Forbereder ${fil.name} …`);
        const klar = await forberedUpload(fil.type, fil.size);
        if (!klar.ok) throw new Error(klar.fejl);

        await send(klar.data.signedUrl, fil, (pct) => setStatus(`${pre}Lægger ${fil.name} op … ${pct}%`));

        const navn = fil.name.replace(/\.[^.]+$/, "");
        const reg = await registrerMedie(klar.data.sti, navn);
        if (!reg.ok) throw new Error(reg.fejl);
      } catch (err) {
        setFejl(`${fil.name}: ${err instanceof Error ? err.message : "Ukendt fejl"}`);
        break;
      }
    }

    setTravl(false);
    setStatus(null);
    if (filRef.current) filRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input
        ref={filRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#14223d] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      <button type="button" onClick={lagOp} disabled={travl} className={KNAP_ROED}>
        {travl ? "Lægger op …" : "Læg op"}
      </button>
      <p className="w-full text-xs text-slate-400">
        Billeder: JPEG, PNG, WebP eller GIF. Videoer: MP4 (H.264) eller WebM. Brug gerne 1920×1080 eller 3840×2160.
      </p>
      {status && <p className="w-full text-sm text-slate-200" aria-live="polite">{status}</p>}
      {fejl && <p className="w-full text-sm text-red-300">{fejl}</p>}
    </div>
  );
}
