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
    grund = typeof raa === "string" ? raa.trim() : "";

    // Bookeren får begrundelsen i afslagsmailen. Et afslag uden forklaring er
    // ikke til nogen nytte.
    if (grund === "") {
      return { tilstand: "fejl", fejl: "Skriv en kort begrundelse for afvisningen." };
    }
    if (grund.length > AFVISNING_MAKS) {
      return {
        tilstand: "fejl",
        fejl: `Begrundelsen må højst være ${AFVISNING_MAKS} tegn.`,
      };
    }
  }

  const svar = await afgoerViaToken(art, token, grund);

  // Godkendelseskøen i adminfladen skal ikke stå med en booking, der lige er
  // besluttet herfra.
  revalidatePath("/admin/lokalebooking");

  return svar.ok ? { tilstand: "ok" } : { tilstand: "fejl", fejl: svar.fejl };
}
