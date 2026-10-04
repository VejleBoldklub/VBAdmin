"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";
import { BUCKET } from "@/lib/infoskaerm/billeder";
import { billedtype, FIL_MAKS } from "@/lib/infoskaerm/billedtype";
import { billedStier, rensDesign } from "@/lib/infoskaerm/design";
import type { DagFarve } from "@/lib/infoskaerm/content";
import type { GemResultat } from "@/lib/infoskaerm/types";

// Designeditorens handlinger.
//
// Som resten af modulets handlinger kontrollerer hver handling selv sin adgang:
// en server action kan rammes fra enhver rute i appen, også fra skærmsiden,
// som med vilje ikke er bag login. Skrivningen sker med service_role.

const ADMIN_STI = "/admin/infoskaerm/design";
const SKAERM_STI = "/infoskaerm/cafeteria";

const FARVER: readonly DagFarve[] = ["Rød", "Gul", "Grøn"];

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";

export async function gemDesign(
  farve: DagFarve,
  design: unknown,
  aktiv: boolean
): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at gemme et infoskærmdesign uden gyldig adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!FARVER.includes(farve)) return { ok: false, fejl: "Ukendt farve." };
  if (typeof aktiv !== "boolean") return { ok: false, fejl: "Designet kunne ikke gemmes." };

  // Designet kommer fra browseren og renses efter samme regler, som skærmen
  // læser det med. Det, der gemmes, er den rensede kopi.
  const ren = rensDesign(design);
  if (!ren) {
    return {
      ok: false,
      fejl: "Designet indeholder noget, skærmen ikke kan vise. Genindlæs siden og prøv igen.",
    };
  }

  // Det forrige design hentes, så billeder, der ikke længere bruges, kan
  // fjernes fra Storage bagefter.
  const { data: foer } = await supabaseAdmin
    .from("infoskaerm_design")
    .select("farve, baggrund, elementer")
    .eq("farve", farve)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("infoskaerm_design")
    .upsert(
      { farve, baggrund: ren.baggrund, elementer: ren.elementer, aktiv },
      { onConflict: "farve" }
    );

  if (error) {
    console.error("Kunne ikke gemme infoskærmdesign:", error);
    return { ok: false, fejl: `Kunne ikke gemme: ${beskrivSupabaseFejl(error)}` };
  }

  await ryd(billedStier(rensDesign(foer)), new Set(billedStier(ren)));

  revalidatePath(ADMIN_STI);
  revalidatePath(SKAERM_STI);

  return { ok: true };
}

// Fjern billedfiler, som det gemte design ikke længere bruger.
//
// Et billede kan være kopieret over i en anden farves design, så hver fil
// slås op i de øvrige designs, før den slettes. Går oprydningen galt, er
// designet stadig gemt — en fil for meget i Storage ses ikke af nogen.
async function ryd(gamle: string[], stadigBrugt: Set<string>) {
  const kandidater = gamle.filter((sti) => !stadigBrugt.has(sti));
  if (kandidater.length === 0) return;

  const { data, error } = await supabaseAdmin
    .from("infoskaerm_design")
    .select("baggrund, elementer");

  if (error) {
    console.error("Kunne ikke læse designs til oprydning:", error);
    return;
  }

  const iBrug = new Set((data ?? []).flatMap((r) => billedStier(rensDesign(r))));
  const slet = kandidater.filter((sti) => !iBrug.has(sti));
  if (slet.length === 0) return;

  const { error: fjernFejl } = await supabaseAdmin.storage.from(BUCKET).remove(slet);
  if (fjernFejl) console.error("Ubrugte designbilleder kunne ikke fjernes:", fjernFejl);
}

export async function lagDesignBilledeOp(
  formular: FormData
): Promise<{ ok: true; sti: string } | { ok: false; fejl: string }> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at lægge et designbillede op uden gyldig adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  const fil = formular.get("fil");
  if (!(fil instanceof File) || fil.size === 0) return { ok: false, fejl: "Vælg et billede." };
  if (fil.size > FIL_MAKS) {
    return { ok: false, fejl: "Billedet er for stort. Prøv et mindre billede." };
  }

  const bytes = new Uint8Array(await fil.arrayBuffer());
  const type = billedtype(bytes);
  if (!type) {
    return { ok: false, fejl: "Filen er ikke et billede, skærmen kan vise (JPEG, PNG eller WebP)." };
  }

  // Under design/, så stierne kan kendes fra billedsidens og kontrolleres i
  // rensDesign.
  const sti = `design/${crypto.randomUUID()}.${type.endelse}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(sti, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });

  if (error) {
    console.error("Kunne ikke lægge designbillede i Storage:", error);
    return {
      ok: false,
      fejl:
        `Billedet kunne ikke gemmes: ${error.message}. Findes bucketen ikke, mangler ` +
        "supabase/infoskaerm-billeder.sql at blive kørt.",
    };
  }

  return { ok: true, sti };
}
