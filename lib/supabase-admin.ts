// Fejler ved build, hvis en klientkomponent importerer dette modul — direkte
// eller gennem et andet modul.
//
// Uden den her var fejlen tavs: modulet blev pakket med i browserbundtet, og da
// service_role-nøglen ikke findes der, kastede det ved indlæsning, og siden
// kunne ikke hydreres. Det ramte /admin/administration, fordi en
// klientkomponent hentede modullisten fra lib/adgang.ts, som importerer
// herfra. Selve nøglen slap ikke ud — Next inliner kun NEXT_PUBLIC-variabler —
// men siden holdt op med at virke.
import "server-only";
import { createClient } from "@supabase/supabase-js";

// VIGTIGT: Denne fil må KUN importeres i server-kode
// (Server Components, Server Actions, Route Handlers).
// Den bruger service_role-nøglen, som har fuld adgang til databasen
// og aldrig må eksponeres til browseren.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Mangler SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i miljøvariabler."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});
