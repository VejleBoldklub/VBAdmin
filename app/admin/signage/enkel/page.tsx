import { supabaseAdmin } from "@/lib/supabase-admin";
import { hentMedier, hentSkaerme, manglerTabel } from "@/lib/signage/data";
import { OpsaetningMangler, SignageShell } from "../ui";
import ScreenManager from "./screen-manager";

// C · Screen Manager: den enkle vej. Vælg en skærm, vælg indhold, planlæg og
// godkend. Samme data som A og B.
export const dynamic = "force-dynamic";
export const metadata = { title: "Screen Manager — Skærme Alliancen" };

function tidspunkt(): number {
  return Date.now();
}

export default async function EnkelSide() {
  const [{ skaerme, antal, fejl }, { medier }] = await Promise.all([hentSkaerme(supabaseAdmin), hentMedier(supabaseAdmin)]);

  return (
    <SignageShell titel="VB Screen Manager" undertitel="Enkel administration af infoskærme" design="C">
      {fejl && manglerTabel(fejl) && <OpsaetningMangler />}
      <ScreenManager skaerme={skaerme} antal={antal} medier={medier} nu={tidspunkt()} />
    </SignageShell>
  );
}
