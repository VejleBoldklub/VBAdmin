import { supabaseAdmin } from "@/lib/supabase-admin";
import { hentMedieBrug, hentMedier, manglerTabel } from "@/lib/signage/data";
import { ETIKET, KORT, OpsaetningMangler, SignageShell } from "../ui";
import MedieUpload from "./medie-upload";
import MedieListe from "./medie-liste";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medier — Skærme Alliancen" };

export default async function MedierSide() {
  const [{ medier, fejl }, brug] = await Promise.all([hentMedier(supabaseAdmin), hentMedieBrug(supabaseAdmin)]);

  return (
    <SignageShell titel="Medier" undertitel="Billeder og videoer, der kan bruges på alle skærme" aktiv="/admin/signage/medier">
      {fejl && manglerTabel(fejl) && <OpsaetningMangler />}
      <section className={KORT}>
        <p className={ETIKET}>Læg op</p>
        <MedieUpload />
      </section>
      <section className="mt-6">
        <p className={ETIKET}>Biblioteket · {medier.length} filer</p>
        <MedieListe medier={medier} brug={brug} />
      </section>
    </SignageShell>
  );
}
