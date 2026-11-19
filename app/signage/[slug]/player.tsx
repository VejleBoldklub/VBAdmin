"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { danskTid, elementVisesNu, skaermTaendt } from "@/lib/signage/plan";
import { midlertidigAktiv, type PlayerData, type PlayerElement } from "@/lib/signage/typer";
import Visning from "@/components/signage/visning";

// Playeren kører alene på skærmen i timevis. Den skal derfor kunne tåle, at
// nettet forsvinder (den bliver ved med det, den har), at en video ikke kan
// afspilles (den springer videre), og at playlisten ændres undervejs (det
// element, der vises, får lov at blive færdigt).

const GENINDLAES_MS = 12 * 60 * 60 * 1000;

function tidspunkt(): number {
  return Date.now();
}

export default function Player({
  slug,
  initial,
  forhaand,
}: {
  slug: string;
  initial: PlayerData | null;
  forhaand: boolean;
}) {
  const [data, setData] = useState<PlayerData | null>(initial);
  const [tid, setTid] = useState(() => danskTid());
  const [aktuelId, setAktuelId] = useState<string | null>(null);
  const [trin, setTrin] = useState(0);
  const [ur, setUr] = useState("");
  const [nuMs, setNuMs] = useState(tidspunkt);

  const opdaterSek = data?.skaerm.opdaterSekunder ?? 60;

  // Hent playlisten igen med skærmens interval.
  useEffect(() => {
    let aktiv = true;
    async function hent() {
      try {
        const res = await fetch(`/api/signage/${slug}${forhaand ? "?forhaand=1" : ""}`, { cache: "no-store" });
        const json = await res.json();
        if (aktiv && json.ok) setData({ skaerm: json.skaerm, elementer: json.elementer, midlertidig: json.midlertidig ?? null });
      } catch (err) {
        console.error("Signage: kunne ikke hente playlisten, beholder den nuværende:", err);
      }
    }
    if (!initial) hent();
    const id = window.setInterval(hent, opdaterSek * 1000);
    return () => {
      aktiv = false;
      window.clearInterval(id);
    };
  }, [slug, forhaand, opdaterSek, initial]);

  // Planlægningen regnes igen hvert halve minut, uret hvert sekund.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTid(danskTid());
      setNuMs(tidspunkt());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Den midlertidige visning slutter præcis til tiden, ikke ved næste hentning.
  const midlTil = data?.midlertidig ? data.skaerm.midlertidigTil : null;
  useEffect(() => {
    if (!midlTil) return;
    const rest = Date.parse(midlTil) - tidspunkt();
    if (rest <= 0 || rest > 2_000_000_000) return;
    const id = window.setTimeout(() => setNuMs(tidspunkt()), rest + 50);
    return () => window.clearTimeout(id);
  }, [midlTil]);

  const midlertidig = data?.midlertidig && midlertidigAktiv(midlTil, nuMs) ? data.midlertidig : null;

  useEffect(() => {
    if (!data?.skaerm.visUr) return;
    const fmt = () =>
      setUr(
        new Date().toLocaleString("da-DK", {
          timeZone: "Europe/Copenhagen",
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    fmt();
    const id = window.setInterval(fmt, 1000);
    return () => window.clearInterval(id);
  }, [data?.skaerm.visUr]);

  // En kiosk-browser, der har kørt i dagevis, kan begynde at hakke. Siden
  // genindlæses derfor af sig selv to gange i døgnet.
  useEffect(() => {
    if (forhaand) return;
    const id = window.setTimeout(() => window.location.reload(), GENINDLAES_MS);
    return () => window.clearTimeout(id);
  }, [forhaand]);

  // Under en midlertidig visning vises kun det ene element, uanset plan.
  const synlige = useMemo(
    () => (midlertidig ? [midlertidig] : data ? data.elementer.filter((e) => elementVisesNu(e, tid)) : []),
    [data, tid, midlertidig]
  );

  const aktuel: PlayerElement | null = useMemo(() => {
    if (synlige.length === 0) return null;
    return synlige.find((e) => e.id === aktuelId) ?? synlige[0];
  }, [synlige, aktuelId]);

  const naeste = useCallback(() => {
    setTrin((t) => t + 1);
    setAktuelId((nu) => {
      if (synlige.length === 0) return null;
      const i = synlige.findIndex((e) => e.id === nu);
      return synlige[(i + 1) % synlige.length].id;
    });
  }, [synlige]);

  // Varigheden for alt andet end videoer, der spilles til ende.
  const skaerm = data?.skaerm;
  const helVideo = aktuel?.type === "video" && (aktuel.sekunder === null || aktuel.sekunder === 0);
  const sekunder = aktuel ? (aktuel.sekunder && aktuel.sekunder > 0 ? aktuel.sekunder : skaerm?.standardSekunder ?? 10) : 0;

  useEffect(() => {
    if (!aktuel || helVideo) return;
    // Ét element alene skal ikke "skifte" til sig selv og blinke.
    if (synlige.length === 1 && aktuel.type !== "video") return;
    const id = window.setTimeout(naeste, sekunder * 1000);
    return () => window.clearTimeout(id);
  }, [aktuel, helVideo, sekunder, naeste, synlige.length, trin]);

  // Næste billede hentes i forvejen, så skiftet ikke viser en halv indlæsning.
  useEffect(() => {
    if (!aktuel || synlige.length < 2) return;
    const i = synlige.findIndex((e) => e.id === aktuel.id);
    const n = synlige[(i + 1) % synlige.length];
    if (n.medieUrl && n.medieType === "billede") {
      const img = new window.Image();
      img.src = n.medieUrl;
    }
  }, [aktuel, synlige]);

  const taendt = midlertidig ? true : skaerm ? skaermTaendt(skaerm, tid) : false;

  const animation =
    skaerm && skaerm.overgang !== "ingen" && skaerm.overgangMs > 0
      ? `${skaerm.overgang === "slide" ? "signage-slide" : "signage-fade"} ${skaerm.overgangMs}ms ease-out`
      : undefined;

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{ background: taendt ? skaerm?.baggrund ?? "#000" : "#000", cursor: forhaand ? "default" : "none" }}
      onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
    >
      <style>{`
        @keyframes signage-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes signage-slide { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      {!data && forhaand && <Besked tekst="Skærmen findes ikke, eller playlisten kan ikke hentes." />}

      {data && taendt && aktuel && (
        <div key={`${aktuel.id}-${trin}`} className="absolute inset-0" style={{ animation }}>
          <Visning element={aktuel} standardTilpasning={skaerm!.tilpasning} lyd={skaerm!.lyd} onSlut={naeste} />
        </div>
      )}

      {data && forhaand && taendt && !aktuel && <Besked tekst="Ingen elementer skal vises lige nu." />}
      {data && forhaand && !taendt && <Besked tekst="Skærmen er slukket lige nu (slået fra eller uden for tænd-tiden)." />}

      {data && taendt && skaerm?.visUr && (
        <div className="absolute right-6 top-5 rounded-xl bg-black/50 px-4 py-2 text-2xl font-semibold tabular-nums text-white">
          {ur}
        </div>
      )}

      {forhaand && (
        <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
          Forhåndsvisning · {midlertidig ? "midlertidig visning" : `${synlige.length} element(er) vises nu`} · dobbeltklik for fuld skærm
        </div>
      )}
    </main>
  );
}

function Besked({ tekst }: { tekst: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-10 text-center text-xl text-white/70">
      {tekst}
    </div>
  );
}
