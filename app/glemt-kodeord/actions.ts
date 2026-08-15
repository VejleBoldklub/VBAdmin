"use server";

import { appBaseUrl } from "@/lib/base-url";
import { supabaseSession } from "@/lib/supabase-session";

export type NulstilResultat = { sendt: true } | { fejl: string } | undefined;

// Bevidst løs kontrol af adressen. En streng validering afviser gyldige
// adresser oftere end den fanger tastefejl, og adressen bekræftes alligevel af,
// om mailen når frem.
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Hvor nulstillingslinket lander. Samme rute som invitationen bruger — den
// tager imod både invite og recovery — og derfra videre til siden, hvor
// adgangskoden sættes.
const VIDERE = "/opret-adgangskode?nulstil=1";

export async function sendNulstilling(
  _forrige: NulstilResultat,
  formData: FormData
): Promise<NulstilResultat> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Formfejl må gerne siges. Den afslører ikke, om adressen findes — kun at
  // det, der blev skrevet, ikke er en adresse.
  if (!MAIL.test(email)) {
    return { fejl: "Skriv en gyldig e-mailadresse." };
  }

  const klient = await supabaseSession();
  const base = await appBaseUrl();

  const { error } = await klient.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/bekraeft?next=${encodeURIComponent(VIDERE)}`,
  });

  // Fejlen logges, men vises ikke.
  //
  // Svaret er det samme, uanset om adressen findes, om afsendelsen fejlede,
  // eller om Supabase har begrænset antallet af forsøg. Ellers kunne
  // formularen bruges til at finde ud af, hvilke adresser der er oprettet i
  // klubbens system — en liste, ingen udefra skal kunne bygge.
  if (error) {
    console.error("Nulstilling til", email, "kunne ikke sendes:", error.message);
  }

  return { sendt: true };
}
