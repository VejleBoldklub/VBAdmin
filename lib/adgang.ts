import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseSession } from "@/lib/supabase-session";
import { erModul, MODULER, type Modul } from "@/lib/moduler";

// Genudstilles, så eksisterende serverkode kan blive ved at importere herfra.
// Klientkomponenter skal derimod importere fra @/lib/moduler direkte — dette
// modul trækker service_role-klienten med sig.
export { MODULER, type Modul };

// Hvem er logget ind, og hvad må de?
//
// Modulet er kilden til begge svar, og både proxy.ts og hver enkelt handling
// spørger her. De to lag er ikke det samme:
//
//   proxy.ts   sender den, der ikke må, videre til /login eller /ingen-adgang.
//              Det er brugerfladen — ingen skal møde en rå fejlside.
//
//   kraevAdgang i en handling er spærren. En server action slås op på sit id og
//              kan rammes fra enhver rute i appen, også de offentlige, som med
//              vilje ikke er bag login. Derfor er det ikke nok, at proxy.ts
//              beskytter /admin. Begrundelsen er den samme som før, den blot
//              hed erAdmin() dengang adgangen var ét delt kodeord.

export type AdminBruger = {
  authUserId: string;
  email: string;
  rolle: "admin" | "user";
  moduler: Modul[];
};

// Den indloggede bruger, eller null.
//
// Der spørges bevidst med getUser() og ikke getSession(). getSession læser
// cookien, som den er, mens getUser får den bekræftet hos Supabase. En cookie
// kommer fra browseren og kan være hvad som helst — den må ikke alene afgøre,
// hvem nogen er.
export async function hentBruger(): Promise<AdminBruger | null> {
  const klient = await supabaseSession();

  const {
    data: { user },
    error,
  } = await klient.auth.getUser();

  if (error || !user?.email) return null;

  // Rollen læses med service_role. admin_users har rækkesikkerhed uden
  // policies, så brugeren kan ikke selv læse sin række — og dermed heller ikke
  // nogen andens.
  const { data, error: opslagsfejl } = await supabaseAdmin
    .from("admin_users")
    .select("auth_user_id, email, rolle, allowed_modules")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (opslagsfejl) {
    console.error("Kunne ikke slå admin_users op:", opslagsfejl);
    return null;
  }

  // Et gyldigt login uden en række her er ikke en adgang. Brugeren kan være
  // oprettet i Supabase Auth uden at være givet adgang endnu, eller adgangen kan
  // være fjernet igen. Begge dele skal give nej.
  if (!data) return null;

  const rolle = data.rolle === "admin" ? "admin" : "user";
  const moduler = Array.isArray(data.allowed_modules)
    ? data.allowed_modules.filter(erModul)
    : [];

  return {
    authUserId: data.auth_user_id,
    email: data.email,
    rolle,
    moduler,
  };
}

export function harAdgangTil(bruger: AdminBruger, modul: Modul): boolean {
  return bruger.rolle === "admin" || bruger.moduler.includes(modul);
}

// Til brug i en server action. Returnerer brugeren, eller null hvis kaldet ikke
// må gennemføres. Handlingen svarer selv brugeren pænt — den skal ikke
// redirecte, for den kaldes fra en side, der allerede er tegnet.
export async function kraevAdgang(modul: Modul): Promise<AdminBruger | null> {
  const bruger = await hentBruger();

  if (!bruger) return null;

  return harAdgangTil(bruger, modul) ? bruger : null;
}

// Brugerstyringen selv. Følger rollen, ikke allowed_modules — ellers kunne en
// bruger få adgang til at give sig selv adgang til resten.
export async function kraevAdministrator(): Promise<AdminBruger | null> {
  const bruger = await hentBruger();

  return bruger?.rolle === "admin" ? bruger : null;
}

// Hvilke moduler brugeren må se på forsiden.
export function synligeModuler(bruger: AdminBruger): Modul[] {
  return bruger.rolle === "admin" ? [...MODULER] : bruger.moduler;
}
