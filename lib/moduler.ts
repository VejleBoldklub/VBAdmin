// Modulnøglerne, adskilt fra resten af adgangslaget.
//
// Filen har med vilje ingen importer. Både serverkoden i lib/adgang.ts og
// klientkomponenterne i adminfladen har brug for listen, og lå den sammen med
// opslagene, ville en klientkomponent trække lib/supabase-admin.ts med sig ind i
// browserbundtet — hvor service_role-nøglen ikke findes, så modulet kaster ved
// indlæsning og siden ikke kan hydreres.
//
// Nøglerne skal svare til check-constraintet på admin_users.allowed_modules og
// til modulkortene i app/page.tsx. Tilføjes et modul, skal alle tre følges ad.
export const MODULER = ["baneplan", "lokalebooking", "infoskaerm"] as const;

export type Modul = (typeof MODULER)[number];

export function erModul(vaerdi: unknown): vaerdi is Modul {
  return typeof vaerdi === "string" && MODULER.some((m) => m === vaerdi);
}
