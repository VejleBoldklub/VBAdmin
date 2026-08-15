"use server";

import { redirect } from "next/navigation";
import { supabaseSession } from "@/lib/supabase-session";

export type KodeResultat = { fejl: string } | undefined;

// Længden er den eneste hårde regel. Krav om store bogstaver og tegn presser
// folk mod "Sommer2026!" og en seddel under tastaturet; længden er det, der
// faktisk gør en forskel.
const MINDST = 10;

export async function saetAdgangskode(
  _forrige: KodeResultat,
  formData: FormData
): Promise<KodeResultat> {
  const kode = String(formData.get("adgangskode") ?? "");
  const gentag = String(formData.get("gentag") ?? "");

  if (kode.length < MINDST) {
    return { fejl: `Adgangskoden skal være mindst ${MINDST} tegn.` };
  }

  if (kode !== gentag) {
    return { fejl: "De to adgangskoder er ikke ens." };
  }

  const klient = await supabaseSession();

  // Sessionen kommer fra invitationslinket. Uden den er der ingen bruger at
  // sætte en adgangskode på, og updateUser afviser.
  const {
    data: { user },
  } = await klient.auth.getUser();

  if (!user) {
    return { fejl: "Linket er udløbet. Bed om en ny invitation." };
  }

  const { error } = await klient.auth.updateUser({ password: kode });

  if (error) {
    console.error("Kunne ikke sætte adgangskode:", error.message);
    return { fejl: error.message };
  }

  redirect("/");
}
