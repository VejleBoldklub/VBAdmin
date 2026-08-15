import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase-klient til den indloggede brugers session.
//
// Adskilt fra de to andre klienter i lib/:
//   supabase-public.ts  anon-nøgle, ingen session — de offentlige sider
//   supabase-admin.ts   service_role, omgår rækkesikkerhed — vores egen skrivning
//   denne fil           anon-nøgle plus brugerens session fra cookies
//
// Sessionen ligger i cookies, ikke i browserens lager. Det er en forudsætning
// for, at proxy.ts og Server Components kan se, hvem der er logget ind, uden at
// der køres JavaScript i browseren først.
//
// Nøglen er anon-nøglen, ikke service_role. Den kan ikke i sig selv læse noget
// beskyttet — det er sessionen, der afgør, hvem brugeren er.

export async function supabaseSession(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Mangler SUPABASE_URL eller SUPABASE_ANON_KEY i miljøvariabler.");
  }

  // next/headers importeres inde i funktionen, ikke på modulniveau.
  //
  // Turbopack afviser en modulniveau-import, så snart modulet indgår i en graf,
  // den ikke kan afgøre er server-only — her gennem både en route handler, en
  // server action og en Server Component. Importen er den samme, den sker bare
  // først når funktionen kaldes, og funktionen kaldes kun på serveren.
  const { cookies } = await import("next/headers");
  const kager = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return kager.getAll();
      },
      setAll(nye) {
        // Server Components må ikke sætte cookies, og Next kaster, hvis man
        // forsøger. Fornyelsen af sessionen sker i proxy.ts, som har lov, så
        // det er forsvarligt at lade forsøget falde her.
        try {
          for (const { name, value, options } of nye) {
            kager.set(name, value, options);
          }
        } catch {
          // Kaldt fra en Server Component. Se ovenfor.
        }
      },
    },
  });
}
