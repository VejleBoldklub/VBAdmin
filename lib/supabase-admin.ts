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
