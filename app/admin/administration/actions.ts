"use server";

import { revalidatePath } from "next/cache";
import { appBaseUrl } from "@/lib/base-url";
import { kraevAdministrator, MODULER, type Modul } from "@/lib/adgang";
import { antalAdministratorer } from "@/lib/administration";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";
import type { GemResultat } from "@/lib/infoskaerm/types";

// Brugerstyring: invitér, ret og fjern.
//
// Hver handling kontrollerer selv, at kaldet kommer fra en administrator.
// Begrundelsen er den samme som for de øvrige moduler — se lib/adgang.ts — og
// vejer tungest her: det er handlingerne i denne fil, der uddeler adgang.

const STI = "/admin/administration";

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";

// Bevidst løs. En streng validering af mailadresser afviser gyldige adresser
// oftere end den fanger tastefejl, og adressen bekræftes alligevel af, om
// invitationen når frem.
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function renseModuler(vaerdier: unknown): Modul[] {
  if (!Array.isArray(vaerdier)) return [];

  return MODULER.filter((m) => vaerdier.includes(m));
}

function tjekRolle(vaerdi: unknown): "admin" | "user" | null {
  return vaerdi === "admin" || vaerdi === "user" ? vaerdi : null;
}

// Navnet er valgfrit. Et blankt felt bliver til null, ikke til en tom streng —
// databasen afviser tomme strenge, og null er det, der betyder "intet navn"
// hele vejen op gennem visningen.
const NAVN_MAKS = 80;

function renseNavn(vaerdi: unknown): string | null | { fejl: string } {
  if (typeof vaerdi !== "string") return null;

  const rent = vaerdi.trim();

  if (rent === "") return null;
  if (rent.length > NAVN_MAKS) return { fejl: `Navnet må højst være ${NAVN_MAKS} tegn.` };

  return rent;
}

function erNavnefejl(v: string | null | { fejl: string }): v is { fejl: string } {
  return typeof v === "object" && v !== null;
}

export async function inviterBruger(
  email: string,
  navn: string,
  rolle: string,
  moduler: string[]
): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at invitere en bruger uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  const rentNavn = renseNavn(navn);
  if (erNavnefejl(rentNavn)) return { ok: false, fejl: rentNavn.fejl };

  const adresse = email.trim().toLowerCase();

  if (!MAIL.test(adresse)) {
    return { ok: false, fejl: "Skriv en gyldig e-mailadresse." };
  }

  const renRolle = tjekRolle(rolle);
  if (!renRolle) return { ok: false, fejl: "Ukendt rolle." };

  const renModuler = renseModuler(moduler);

  if (renRolle === "user" && renModuler.length === 0) {
    return {
      ok: false,
      fejl: "Vælg mindst ét modul. En bruger uden moduler kan logge ind, men ikke åbne noget.",
    };
  }

  // Invitationen sendes af Supabase Auth. Der bygges bevidst ikke et eget
  // token- og mailflow: det findes allerede her, og et hjemmelavet ville skulle
  // løse udløb, engangsbrug og genafsendelse forfra.
  const base = await appBaseUrl();

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(adresse, {
    redirectTo: `${base}/auth/bekraeft?next=/opret-adgangskode`,
  });

  if (error || !data.user) {
    console.error("Kunne ikke invitere", adresse, "-", error?.message);

    // Den hyppigste årsag er, at adressen allerede findes i Supabase Auth.
    // Beskeden derfra er brugbar og vises som den er — siden er bag login.
    return { ok: false, fejl: error?.message ?? "Invitationen kunne ikke sendes." };
  }

  const { error: raekkefejl } = await supabaseAdmin.from("admin_users").upsert(
    {
      auth_user_id: data.user.id,
      email: adresse,
      navn: rentNavn,
      rolle: renRolle,
      allowed_modules: renRolle === "admin" ? [] : renModuler,
    },
    { onConflict: "auth_user_id" }
  );

  if (raekkefejl) {
    // Brugeren er oprettet i Auth, men har ingen adgang. Det skal siges tydeligt
    // — ellers står der en invitation, der fører til "ingen adgang".
    console.error("Bruger inviteret, men adgangen kunne ikke gemmes:", raekkefejl);
    return {
      ok: false,
      fejl: `Invitationen blev sendt, men adgangen kunne ikke gemmes: ${beskrivSupabaseFejl(raekkefejl)}`,
    };
  }

  revalidatePath(STI);
  return { ok: true };
}

export async function opdaterBruger(
  authUserId: string,
  navn: string,
  rolle: string,
  moduler: string[]
): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at ændre en bruger uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  const rentNavn = renseNavn(navn);
  if (erNavnefejl(rentNavn)) return { ok: false, fejl: rentNavn.fejl };

  const renRolle = tjekRolle(rolle);
  if (!renRolle) return { ok: false, fejl: "Ukendt rolle." };

  const renModuler = renseModuler(moduler);

  if (renRolle === "user" && renModuler.length === 0) {
    return { ok: false, fejl: "Vælg mindst ét modul, eller gør brugeren til administrator." };
  }

  // Den sidste administrator må ikke fjerne sin egen rolle. Vejen tilbage ville
  // gå gennem SQL-editoren i Supabase, og det er ikke et sted, klubben skal
  // hen for at komme ind i sit eget adminværktøj.
  if (
    authUserId === kalder.authUserId &&
    renRolle !== "admin" &&
    (await antalAdministratorer()) <= 1
  ) {
    return {
      ok: false,
      fejl: "Du er den sidste administrator. Gør en anden til administrator først.",
    };
  }

  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({
      navn: rentNavn,
      rolle: renRolle,
      allowed_modules: renRolle === "admin" ? [] : renModuler,
    })
    .eq("auth_user_id", authUserId);

  if (error) {
    console.error("Kunne ikke opdatere bruger:", error);
    return { ok: false, fejl: `Kunne ikke gemme: ${beskrivSupabaseFejl(error)}` };
  }

  revalidatePath(STI);
  return { ok: true };
}

export async function fjernBruger(authUserId: string): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at fjerne en bruger uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (authUserId === kalder.authUserId) {
    return { ok: false, fejl: "Du kan ikke fjerne dig selv." };
  }

  // Rækken slettes først. Går det andet trin galt, er adgangen alligevel væk —
  // det er den rækkefølge, der fejler mest skånsomt.
  const { error } = await supabaseAdmin
    .from("admin_users")
    .delete()
    .eq("auth_user_id", authUserId);

  if (error) {
    console.error("Kunne ikke fjerne bruger:", error);
    return { ok: false, fejl: `Kunne ikke fjerne: ${beskrivSupabaseFejl(error)}` };
  }

  // Auth-brugeren slettes med. Bliver den stående, kan adressen ikke inviteres
  // igen — Supabase svarer, at brugeren allerede findes.
  const { error: authfejl } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

  if (authfejl) {
    console.error("Adgang fjernet, men auth-brugeren kunne ikke slettes:", authfejl.message);
    revalidatePath(STI);

    return {
      ok: false,
      fejl: `Adgangen er fjernet, men brugeren findes stadig i Supabase Auth: ${authfejl.message}`,
    };
  }

  revalidatePath(STI);
  return { ok: true };
}
