import { supabaseAdmin } from "@/lib/supabase-admin";
import { MODULER, type Modul } from "@/lib/adgang";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";

// Læsning af brugerlisten.
//
// Ligger i et modul UDEN "use server". Funktionen returnerer mailadresser, og
// i et "use server"-modul ville hver eksport blive et endepunkt, der kunne
// kaldes udefra. Samme grund som features/lokalebooking/bookinger.ts.

export type AdminBrugerRaekke = {
  authUserId: string;
  email: string;
  // Null, når ingen har skrevet et navn. Listen viser så adressen alene frem
  // for en tom plads eller en pladsholdertekst.
  navn: string | null;
  rolle: "admin" | "user";
  moduler: Modul[];
  oprettet: string;
};

function erModul(vaerdi: unknown): vaerdi is Modul {
  return typeof vaerdi === "string" && MODULER.some((m) => m === vaerdi);
}

export async function hentBrugere(): Promise<{
  brugere: AdminBrugerRaekke[];
  fejl: string | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("auth_user_id, email, navn, rolle, allowed_modules, oprettet")
    .order("navn", { ascending: true, nullsFirst: false })
    .order("email", { ascending: true });

  if (error) {
    console.error("Kunne ikke hente brugere:", error);
    return { brugere: [], fejl: beskrivSupabaseFejl(error) };
  }

  const brugere = (Array.isArray(data) ? data : []).map((r) => ({
    authUserId: String(r.auth_user_id),
    email: String(r.email),
    navn: typeof r.navn === "string" && r.navn.trim() !== "" ? r.navn : null,
    rolle: r.rolle === "admin" ? ("admin" as const) : ("user" as const),
    moduler: Array.isArray(r.allowed_modules) ? r.allowed_modules.filter(erModul) : [],
    oprettet: String(r.oprettet),
  }));

  return { brugere, fejl: null };
}

// Hvor mange administratorer der er tilbage.
//
// Bruges til at forhindre, at den sidste administrator fjerner sin egen rolle
// eller sig selv. Uden den kontrol ville brugerstyringen kunne låse alle ude,
// og vejen tilbage ville gå gennem SQL-editoren i Supabase.
export async function antalAdministratorer(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("admin_users")
    .select("auth_user_id", { count: "exact", head: true })
    .eq("rolle", "admin");

  if (error) {
    console.error("Kunne ikke tælle administratorer:", error);

    // Ved tvivl svares der, at der kun er én. Så afvises en ændring, der kunne
    // låse alle ude, frem for at blive tilladt på et usikkert grundlag.
    return 1;
  }

  return count ?? 0;
}
