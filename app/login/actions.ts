"use server";

import { redirect } from "next/navigation";
import { supabaseSession } from "@/lib/supabase-session";

// Login og logud.
//
// Adgangskoden sendes til Supabase Auth, som sætter sessionen i cookies. Der
// findes ingen selvbygget kontrol af adgangskoder her, og der skal ikke bygges
// en: hashning, forsøgsbegrænsning og fornyelse af tokens hører til hos den,
// der har bygget det til formålet.

export type LoginResultat = { fejl: string } | undefined;

// Bevidst den samme besked ved forkert adresse og forkert adgangskode. To
// forskellige beskeder ville gøre det muligt at afgøre, om en adresse findes.
const FORKERT = "Forkert e-mail eller adgangskode.";

// Hvor der sendes hen efter login. Værdien kommer fra en forespørgsel og må
// derfor kun være en sti på vores eget domæne — ellers kunne et link sende en
// nyligt indlogget bruger videre til en fremmed side.
function trygVidere(vaerdi: FormDataEntryValue | null): string {
  if (typeof vaerdi !== "string") return "/";
  if (!vaerdi.startsWith("/") || vaerdi.startsWith("//")) return "/";

  return vaerdi;
}

export async function logInd(_forrige: LoginResultat, formData: FormData): Promise<LoginResultat> {
  const email = String(formData.get("email") ?? "").trim();
  const adgangskode = String(formData.get("adgangskode") ?? "");
  const videre = trygVidere(formData.get("videre"));

  if (!email || !adgangskode) {
    return { fejl: "Udfyld både e-mail og adgangskode." };
  }

  const klient = await supabaseSession();
  const { error } = await klient.auth.signInWithPassword({ email, password: adgangskode });

  if (error) {
    console.error("Mislykket login for", email, "-", error.message);
    return { fejl: FORKERT };
  }

  // redirect kaster for at afbryde handlingen og må derfor ikke stå i en
  // try/catch, som ville opfange den som en fejl.
  redirect(videre);
}

export async function logUd() {
  const klient = await supabaseSession();
  await klient.auth.signOut();

  redirect("/login");
}

// Logud, som brugeren ikke selv bad om. Kaldes af Inaktivitetsvagt, når
// adminfladen har stået urørt for længe.
//
// Adskilt fra logUd alene for at kunne sige hvorfor på loginsiden. Uden en
// besked ville brugeren møde en almindelig loginside og tro, at systemet smed
// dem ud af sig selv.
//
// Handlingen kræver ingen adgangskontrol: den kan kun rydde kalderens egen
// session, og en ikke-indlogget bruger, der rammer den, mister ingenting.
//
// Til forskel fra logUd viderestiller den ikke. Vagten sender selv browseren til
// loginsiden med en almindelig sideindlæsning, netop fordi det er et logud: en
// blød viderestilling ville lade Nexts routercache i browseren beholde de
// adminsider, brugeren lige forlod, og de kunne stadig vises med tilbageknappen.
export async function logUdVedInaktivitet(): Promise<void> {
  const klient = await supabaseSession();
  await klient.auth.signOut();
}
