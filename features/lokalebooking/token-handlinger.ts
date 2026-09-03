"use server";

import { revalidatePath } from "next/cache";
import { afgoerViaToken, type TokenArt } from "./beslutning";
import type { BeslutSvar } from "./types";

// Handlingen bag knappen på de sider, mail-linkene åbner.
//
// Der er ingen login-kontrol her, og det er med vilje: tokenet ER adgangen. Det
// er 256 tilfældige bit, det kan ikke gættes, og kun hashen ligger i databasen.
// Den, der har linket fra notifikationsmailen, er den, der skulle tage stilling.
//
// Selve opdateringen ligger i beslutning.ts sammen med adminfladens, så de to
// veje ikke kan komme til at gøre forskellige ting.

const AFVISNING_MAKS = 500;

export async function afgoerMedToken(
  art: TokenArt,
  token: string,
  _forrige: BeslutSvar,
  fd: FormData
): Promise<BeslutSvar> {
  let grund: string | null = null;

  if (art === "afvis") {
    const raa = fd.get("grund");
    const renGrund = typeof raa === "string" ? raa.trim() : "";

    if (renGrund.length > AFVISNING_MAKS) {
      return {
        tilstand: "fejl",
        fejl: `Begrundelsen må højst være ${AFVISNING_MAKS} tegn.`,
      };
    }

    // Valgfri, præcis som i adminfladen. De to veje er den samme beslutning truffet
    // af den samme person, og de skal derfor stille det samme krav — ellers
    // afhænger det af, om Sine sad i adminfladen eller havde mailen fremme.
    // Tom streng bliver til null, så "ikke udfyldt" kun har én repræsentation.
    grund = renGrund === "" ? null : renGrund;
  }

  const svar = await afgoerViaToken(art, token, grund);

  // Godkendelseskøen i adminfladen skal ikke stå med en booking, der lige er
  // besluttet herfra.
  revalidatePath("/admin/lokalebooking");

  return svar.ok ? { tilstand: "ok" } : { tilstand: "fejl", fejl: svar.fejl };
}
