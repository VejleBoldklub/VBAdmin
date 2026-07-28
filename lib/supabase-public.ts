import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Læsende Supabase-klient til de offentlige baneplansider.
//
// Bruger anon-nøglen, ikke service_role. Adgangen afgøres derfor af
// rækkesikkerheden på baneplan_versioner, som kun tillader anon at læse rækker
// med status = 'live'. Se supabase/rls-offentlig-laesning.sql.
//
// Nøglen har bevidst IKKE NEXT_PUBLIC-præfiks: de offentlige sider er Server
// Components, så nøglen skal ikke og kommer ikke i browseren.
//
// Klienten oprettes først ved første brug. lib/supabase-admin.ts kaster på
// modulniveau, hvilket får `next build` til at fejle, når miljøvariabler mangler,
// fordi Next importerer modulet under indsamling af sidedata. Det gentages ikke
// her.

let klient: SupabaseClient | null = null;

export function supabasePublic(): SupabaseClient {
  if (klient) return klient;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Mangler SUPABASE_URL eller SUPABASE_ANON_KEY i miljøvariabler.");
  }

  klient = createClient(url, anonKey, { auth: { persistSession: false } });
  return klient;
}
