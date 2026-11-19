import { ETIKET, KORT, SignageShell } from "../ui";

export const metadata = { title: "Opsætning af skærm — Skærme Alliancen" };

// Hvordan en fysisk skærm kobles på. Der er ingen agent at installere: en
// skærm er en browser i fuld skærm, der peger på sin player-URL.
export default function Vejledning() {
  return (
    <SignageShell titel="Opsætning af skærm" undertitel="Sådan kobles en ny skærm på" aktiv="/admin/signage/vejledning">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={KORT}>
          <p className={ETIKET}>1 · Opret skærmen</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Tilføj skærmen i Operations Center og giv den et navn. Den får sin egen adresse, fx
            <code className="mx-1 rounded bg-black/40 px-1">/signage/klubhus-indgang</code>. Kopiér adressen.
          </p>
        </section>
        <section className={KORT}>
          <p className={ETIKET}>2 · Windows 11 (Assigned Access / kiosk)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-300">
            <li>Indstillinger › Konti › Andre brugere › Konfigurer en kiosk.</li>
            <li>Vælg Microsoft Edge og &quot;Som en digital skilt- eller interaktiv visning&quot;.</li>
            <li>Indsæt skærmens adresse som URL. Sæt &quot;genstart efter inaktivitet&quot; til Aldrig.</li>
            <li>Genstart pc&apos;en. Den starter nu direkte i skærmen.</li>
          </ol>
        </section>
        <section className={KORT}>
          <p className={ETIKET}>Alternativ · almindelig browser</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Åbn adressen i Edge eller Chrome og tryk F11. Eller start Edge med
            <code className="mx-1 break-all rounded bg-black/40 px-1">msedge --kiosk &lt;adresse&gt; --edge-kiosk-type=fullscreen</code>.
            Dobbeltklik på skærmen skifter også til fuld skærm.
          </p>
        </section>
        <section className={KORT}>
          <p className={ETIKET}>Lyd på videoer</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Browsere afspiller kun automatisk med lyd, hvis det er tilladt. Start Edge/Chrome med
            <code className="mx-1 rounded bg-black/40 px-1">--autoplay-policy=no-user-gesture-required</code> og slå
            &quot;Lyd på videoer&quot; til under skærmens indstillinger. Ellers spilles videoerne uden lyd.
          </p>
        </section>
        <section className={KORT}>
          <p className={ETIKET}>Status</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            En skærm melder sig, hver gang den henter sin playliste. Har den ikke meldt sig i et stykke tid, vises den som
            Offline i Operations Center. Ændringer i playlisten når frem uden at nogen skal røre skærmen.
          </p>
        </section>
        <section className={KORT}>
          <p className={ETIKET}>Videoformat</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Brug MP4 med H.264 i 1920×1080. Det kan alle skærme afspille. Store filer kan komprimeres gratis med
            HandBrake (forvalget &quot;Fast 1080p30&quot;).
          </p>
        </section>
      </div>
    </SignageShell>
  );
}
