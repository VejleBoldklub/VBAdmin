import { supabaseAdmin } from "@/lib/supabase-admin";
import { hentElementer, hentMedier, hentSkaerme, manglerTabel } from "@/lib/signage/data";
import { OpsaetningMangler, SignageShell } from "../ui";
import Studio from "./studio";

// B · Content Studio: én skærm ad gangen, med lærredet i midten, playlisten
// som tidslinje og egenskaberne til højre. Samme data som A og C.
export const dynamic = "force-dynamic";
export const metadata = { title: "Content Studio — Skærme Alliancen" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StudioSide({ searchParams }: { searchParams: Promise<{ skaerm?: string }> }) {
  const sp = await searchParams;
  const [{ skaerme, fejl }, { medier }] = await Promise.all([hentSkaerme(supabaseAdmin), hentMedier(supabaseAdmin)]);

  const valgt = skaerme.find((s) => s.id === (sp.skaerm && UUID.test(sp.skaerm) ? sp.skaerm : "")) ?? skaerme[0] ?? null;
  const { elementer } = valgt ? await hentElementer(supabaseAdmin, valgt.id) : { elementer: [] };

  return (
    <SignageShell titel="VB Content Studio" undertitel="Design indhold til infoskærmene" design="B">
      {fejl && manglerTabel(fejl) && <OpsaetningMangler />}
      {!valgt && !fejl && <p className="text-slate-400">Der er ingen skærme endnu. Opret en under A · Operations Center.</p>}
      {valgt && (
        <Studio
          key={valgt.id}
          skaerm={valgt}
          skaerme={skaerme.map((s) => ({ id: s.id, navn: s.navn }))}
          elementer={elementer}
          medier={medier}
        />
      )}
    </SignageShell>
  );
}
