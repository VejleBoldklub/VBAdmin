// Grænserne for automatisk logud ved inaktivitet.
//
// Modulet har bevidst ingen afhængigheder. Værdierne læses både af
// Inaktivitetsvagt i browseren og af loginsiden på serveren, som skriver
// minuttallet i beskeden til brugeren. Stod tallet to steder, ville beskeden
// før eller siden komme til at love noget andet, end vagten gør.
//
// Dette er brugerfladen, ikke spærren. En timer i browseren kan slås fra med
// udviklerværktøjer, og sessionen ligger i en cookie, som stadig er gyldig.
// Den egentlige begrænsning sættes i Supabase under Authentication → Sessions
// (Inactivity timeout). Fremgangsmåden står i .env.example, hvor de øvrige
// Supabase-indstillinger til login er beskrevet.

export const INAKTIVITET_MINUTTER = 30;

// Hvornår advarslen vises. Skal være mindre end INAKTIVITET_MINUTTER, ellers
// bliver brugeren logget ud uden varsel.
export const ADVARSEL_MINUTTER = 29;

export const INAKTIVITET_MS = INAKTIVITET_MINUTTER * 60_000;
export const ADVARSEL_MS = ADVARSEL_MINUTTER * 60_000;
