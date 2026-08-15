"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";
import type { DagFarve } from "@/lib/infoskaerm/content";
import type { GemResultat } from "@/lib/infoskaerm/types";

// Redigering af ugeplanen fra adminfladen.
//
// Handlingen kontrollerer selv, at kaldet kommer fra en indlogget
// administrator. Begrundelsen står i lib/admin-auth.ts — kort: en server action
// er et endepunkt, der slås op på sit id og kan rammes fra enhver rute i appen.
// Her vejer det ekstra tungt, fordi modulets egen offentlige rute,
// /infoskaerm/cafeteria, med vilje ikke er bag login, og skrivningen sker med
// service_role. Uden kontrollen kunne enhver, der kan se skærmsiden, ændre hvad
// der står på den.

const ADMIN_STI = "/admin/infoskaerm";
const SKAERM_STI = "/infoskaerm/cafeteria";

const FARVER: readonly DagFarve[] = ["Rød", "Gul", "Grøn"];

// Beskeden vises på en skærm i cafeteriet med meget stor skrift. Længere end
// dette bliver alligevel ikke læseligt, og grænsen holder samtidig en tastefejl
// fra at fylde databasen.
const BESKED_MAKS = 300;

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";
const GENERISK = "Dagen kunne ikke gemmes. Prøv igen.";

// Datoen kommer fra klienten og bruges som nøgle i databasen. Formen tjekkes
// først, og derefter at det faktisk er en dato der findes — "2026-02-31" har
// den rigtige form, men ruller over til 3. marts, hvis den bare sendes videre.
const DATO_FORM = /^\d{4}-\d{2}-\d{2}$/;

function erGyldigDato(dato: string): boolean {
  if (!DATO_FORM.test(dato)) return false;

  const [aar, maaned, dag] = dato.split("-").map(Number);
  const d = new Date(Date.UTC(aar, maaned - 1, dag));

  return (
    d.getUTCFullYear() === aar && d.getUTCMonth() === maaned - 1 && d.getUTCDate() === dag
  );
}

export async function gemDag(
  dato: string,
  farve: DagFarve,
  ekstraBesked: string
): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at ændre infoskærmens ugeplan uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!erGyldigDato(dato)) {
    return { ok: false, fejl: GENERISK };
  }

  if (!FARVER.includes(farve)) {
    return { ok: false, fejl: GENERISK };
  }

  const renBesked = ekstraBesked.trim();
  if (renBesked.length > BESKED_MAKS) {
    return { ok: false, fejl: `Beskeden må højst være ${BESKED_MAKS} tegn.` };
  }

  const { error } = await supabaseAdmin
    .from("infoskaerm_ugeplan")
    .upsert({ dato, farve, ekstra_besked: renBesked }, { onConflict: "dato" });

  if (error) {
    console.error("Kunne ikke gemme infoskærmens ugeplan:", error);

    // Databasens egen besked vises. Siden ligger bag login, og uden beskeden
    // ser en manglende tabel, en manglende rettighed og en tastefejl ens ud —
    // "prøv igen" fører kun til at man prøver igen.
    return { ok: false, fejl: `Kunne ikke gemme: ${beskrivSupabaseFejl(error)}` };
  }

  revalidatePath(ADMIN_STI);

  // Skærmsiden gengives også. Den henter ganske vist selv nye data hvert andet
  // minut, men den bliver også genindlæst, når kiosken genstartes, og skal så
  // vise det, der står nu.
  revalidatePath(SKAERM_STI);

  return { ok: true };
}
