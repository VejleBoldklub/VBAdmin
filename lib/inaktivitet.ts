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

// !!! MIDLERTIDIGE TESTVÆRDIER — MÅ IKKE MERGES !!!
//
// Sat ned til 1 og 2 minutter, så forløbet kan afprøves uden at vente en halv
// time. De rigtige værdier er 30 og 29 og skal sættes tilbage, før PR'en merges.
// Ændringen ligger i sin egen commit netop for at kunne fjernes med et
// `git revert`.
export const INAKTIVITET_MINUTTER = 2;

// Hvornår advarslen vises. Skal være mindre end INAKTIVITET_MINUTTER, ellers
// bliver brugeren logget ud uden varsel.
export const ADVARSEL_MINUTTER = 1;

export const INAKTIVITET_MS = INAKTIVITET_MINUTTER * 60_000;
export const ADVARSEL_MS = ADVARSEL_MINUTTER * 60_000;
