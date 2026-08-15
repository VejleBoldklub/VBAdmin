"use server";

import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";
import type { DagFarve, IndholdBlokRow, IndholdRow } from "@/lib/infoskaerm/content";
import type { GemResultat } from "@/lib/infoskaerm/types";

// Redigering af kostindholdet pr. farve.
//
// Som ugeplanens handling kontrollerer denne selv sin adgang. Begrundelsen står
// i lib/admin-auth.ts. Det gælder også her, hvor skrivningen sker med
// service_role og modulets egen skærmside med vilje ikke er bag login.

const ADMIN_STI = "/admin/infoskaerm/indhold";
const SKAERM_STI = "/infoskaerm/cafeteria";

const FARVER: readonly DagFarve[] = ["Rød", "Gul", "Grøn"];
const HEX = /^#[0-9A-Fa-f]{6}$/;

// Grænserne er sat efter skærmen, ikke efter databasen. Teksten vises med meget
// stor skrift i en smal kolonne, og selv om den nu skalerer ned frem for at
// blive klippet, holder en blok på en roman ikke op med at være ulæselig.
const MAKS = {
  titel: 60,
  undertitel: 120,
  kortnavn: 40,
  blokTitel: 60,
  blokTekst: 600,
  blokke: 6,
} as const;

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";

function tjekTekst(vaerdi: unknown, navn: string, maks: number): string | GemResultat {
  if (typeof vaerdi !== "string") return { ok: false, fejl: `${navn} mangler.` };

  const ren = vaerdi.trim();

  if (ren === "") return { ok: false, fejl: `${navn} må ikke være tom.` };
  if (ren.length > maks) return { ok: false, fejl: `${navn} må højst være ${maks} tegn.` };

  return ren;
}

function erFejl(vaerdi: string | GemResultat): vaerdi is GemResultat {
  return typeof vaerdi !== "string";
}

export async function gemIndhold(raekke: IndholdRow): Promise<GemResultat> {
  if (!(await kraevAdgang("infoskaerm"))) {
    console.error("Afvist forsøg på at ændre infoskærmens indhold uden gyldig admin-adgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!raekke || !FARVER.includes(raekke.farve)) {
    return { ok: false, fejl: "Ukendt farve." };
  }

  const titel = tjekTekst(raekke.titel, "Titel", MAKS.titel);
  if (erFejl(titel)) return titel;

  const undertitelDa = tjekTekst(raekke.undertitel_da, "Undertitel (dansk)", MAKS.undertitel);
  if (erFejl(undertitelDa)) return undertitelDa;

  const undertitelEn = tjekTekst(raekke.undertitel_en, "Undertitel (engelsk)", MAKS.undertitel);
  if (erFejl(undertitelEn)) return undertitelEn;

  const kortnavn = tjekTekst(raekke.kortnavn, "Dagens navn", MAKS.kortnavn);
  if (erFejl(kortnavn)) return kortnavn;

  if (!HEX.test(raekke.farvekode) || !HEX.test(raekke.lys_farvekode)) {
    return { ok: false, fejl: "Farvekoderne skal være hex, fx #B91C1C." };
  }

  if (!Array.isArray(raekke.blokke) || raekke.blokke.length === 0) {
    return { ok: false, fejl: "Der skal være mindst én blok." };
  }

  if (raekke.blokke.length > MAKS.blokke) {
    return { ok: false, fejl: `Der kan højst være ${MAKS.blokke} blokke.` };
  }

  const blokke: IndholdBlokRow[] = [];

  for (const [i, blok] of raekke.blokke.entries()) {
    const nr = i + 1;

    const titelDa = tjekTekst(blok?.titel_da, `Blok ${nr}: dansk titel`, MAKS.blokTitel);
    if (erFejl(titelDa)) return titelDa;

    const titelEn = tjekTekst(blok?.titel_en, `Blok ${nr}: engelsk titel`, MAKS.blokTitel);
    if (erFejl(titelEn)) return titelEn;

    const tekstDa = tjekTekst(blok?.tekst_da, `Blok ${nr}: dansk tekst`, MAKS.blokTekst);
    if (erFejl(tekstDa)) return tekstDa;

    const tekstEn = tjekTekst(blok?.tekst_en, `Blok ${nr}: engelsk tekst`, MAKS.blokTekst);
    if (erFejl(tekstEn)) return tekstEn;

    blokke.push({
      titel_da: titelDa,
      titel_en: titelEn,
      tekst_da: tekstDa,
      tekst_en: tekstEn,
    });
  }

  const { error } = await supabaseAdmin.from("infoskaerm_indhold").upsert(
    {
      farve: raekke.farve,
      titel,
      undertitel_da: undertitelDa,
      undertitel_en: undertitelEn,
      kortnavn,
      farvekode: raekke.farvekode.toUpperCase(),
      lys_farvekode: raekke.lys_farvekode.toUpperCase(),
      blokke,
    },
    { onConflict: "farve" }
  );

  if (error) {
    console.error("Kunne ikke gemme infoskærmens indhold:", error);
    return { ok: false, fejl: `Kunne ikke gemme: ${beskrivSupabaseFejl(error)}` };
  }

  revalidatePath(ADMIN_STI);
  revalidatePath(SKAERM_STI);

  return { ok: true };
}
