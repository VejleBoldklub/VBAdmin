import { supabaseAdmin } from "@/lib/supabase-admin";
import { MODULER, type Modul } from "@/lib/adgang";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";

// Læsning af brugerlisten.
//
// Ligger i et modul UDEN "use server". Funktionen returnerer mailadresser, og
// i et "use server"-modul ville hver eksport blive et endepunkt, der kunne
// kaldes udefra. Samme grund som features/lokalebooking/bookinger.ts.

// Hvornår brugeren sidst loggede ind.
//
// Tre tilstande, ikke en nullable dato. "Aldrig logget ind" og "kunne ikke
// hentes" ser ens ud som null, og de to må ikke forveksles: den første er en
// oplysning om brugeren, den anden er en fejl hos os. Viste vi "Endnu ikke
// logget ind", når opslaget var fejlet, ville listen påstå noget forkert om
// alle på én gang.
export type SidsteLogin =
  | { slags: "tidspunkt"; iso: string }
  | { slags: "aldrig" }
  | { slags: "ukendt" };

export type AdminBrugerRaekke = {
  authUserId: string;
  email: string;
  // Null, når ingen har skrevet et navn. Listen viser så adressen alene frem
  // for en tom plads eller en pladsholdertekst.
  navn: string | null;
  rolle: "admin" | "user";
  moduler: Modul[];
  oprettet: string;
  sidsteLogin: SidsteLogin;
};

function erModul(vaerdi: unknown): vaerdi is Modul {
  return typeof vaerdi === "string" && MODULER.some((m) => m === vaerdi);
}

// last_sign_in_at ligger i auth.users, som PostgREST ikke udstiller. Den kan
// derfor ikke joines på admin_users — den skal hentes gennem Auths eget
// admin-API med service_role.
//
// Ét opslag for hele listen frem for ét pr. bruger. Klubben har en håndfuld
// brugere, men et opslag pr. række ville blive til lige så mange rundture.
const SIDE_STOERRELSE = 1000;

// Loftet er en spærre mod en løkke uden ende, ikke en forventning. 1000 brugere
// er langt over, hvad en fodboldklubs adminflade nogensinde får.
const MAKS_SIDER = 5;

async function hentSidsteLogin(): Promise<Map<string, string | null> | null> {
  const efterId = new Map<string, string | null>();

  for (let side = 1; side <= MAKS_SIDER; side++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: side,
      perPage: SIDE_STOERRELSE,
    });

    if (error) {
      console.error("Kunne ikke hente sidste login fra Supabase Auth:", error.message);
      return null;
    }

    for (const bruger of data.users) {
      efterId.set(bruger.id, bruger.last_sign_in_at ?? null);
    }

    if (data.users.length < SIDE_STOERRELSE) break;
  }

  return efterId;
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

  // Fejler opslaget, står listen stadig — adgangen kan administreres uden at
  // vide hvornår nogen sidst loggede ind. Rækkerne siger så "ukendt" frem for
  // at påstå, at ingen har været logget ind.
  const login = await hentSidsteLogin();

  const brugere = (Array.isArray(data) ? data : []).map((r) => ({
    authUserId: String(r.auth_user_id),
    email: String(r.email),
    navn: typeof r.navn === "string" && r.navn.trim() !== "" ? r.navn : null,
    rolle: r.rolle === "admin" ? ("admin" as const) : ("user" as const),
    moduler: Array.isArray(r.allowed_modules) ? r.allowed_modules.filter(erModul) : [],
    oprettet: String(r.oprettet),
    sidsteLogin: sidsteLoginFor(login, String(r.auth_user_id)),
  }));

  return { brugere, fejl: null };
}

function sidsteLoginFor(
  login: Map<string, string | null> | null,
  authUserId: string
): SidsteLogin {
  if (!login) return { slags: "ukendt" };

  const iso = login.get(authUserId);

  // Findes brugeren slet ikke i Auth, er noget galt et andet sted end her —
  // rækken i admin_users peger på en auth-bruger, der er væk. "Ukendt" er det
  // ærlige svar; "aldrig" ville skjule det.
  if (iso === undefined) return { slags: "ukendt" };

  return iso ? { slags: "tidspunkt", iso } : { slags: "aldrig" };
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
