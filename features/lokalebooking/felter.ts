// Kontrol af de felter, et menneske udfylder på en booking.
//
// Ligger for sig, fordi der nu er to indgange til at oprette en booking: den
// offentlige rute i opret.ts og adminfladens egen formular i admin-opret.ts.
// Begge skal stille nøjagtig de samme krav til formål, navn, mail og resten, og
// to kopier ville uundgåeligt komme fra hinanden — typisk ved at den ene får en
// længdegrænse rettet og den anden ikke.
//
// Længderne er de samme som check-reglerne i supabase/lokalebooking-skema.sql. Er
// de to uenige, vinder databasen, og brugeren får en generisk fejl i stedet for en
// brugbar. Rettes en grænse her, skal den også rettes i skemaet.
//
// Filen har med vilje hverken "use server" eller nogen import af en
// Supabase-klient: den skal kunne bruges fra begge serverhandlinger uden at
// trække en databaseforbindelse med sig.

// Samme mønster som check-reglen i databasen. Bevidst løs: formålet er at fange
// tastefejl, ikke at afgøre om en adresse findes.
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function tekstFra(fd: FormData, navn: string): string {
  const v = fd.get(navn);
  return typeof v === "string" ? v.trim() : "";
}

// Kun de felter, kontrollen kigger på. En bredere type ville binde funktionen til
// den ene formulars form, og de to formularer har ikke de samme felter — kun de
// samme kontaktoplysninger.
export type Kontaktfelter = {
  formaal: string;
  hold: string;
  navn: string;
  email: string;
  mobil: string;
  besked: string;
};

export function tjekFelter(v: Kontaktfelter): string[] {
  const fejl: string[] = [];

  if (v.formaal.length < 1) fejl.push("Skriv hvad lokalet skal bruges til.");
  else if (v.formaal.length > 200) fejl.push("Formålet må højst være 200 tegn.");

  if (v.hold.length > 100) fejl.push("Hold må højst være 100 tegn.");

  if (v.navn.length < 2) fejl.push("Skriv dit navn.");
  else if (v.navn.length > 100) fejl.push("Navnet må højst være 100 tegn.");

  if (!EMAIL.test(v.email)) fejl.push("Skriv en gyldig e-mailadresse.");

  if (v.mobil.length < 6 || v.mobil.length > 20) fejl.push("Skriv et mobilnummer.");

  if (v.besked.length > 2000) fejl.push("Beskeden må højst være 2000 tegn.");

  return fejl;
}

// Tomme valgfrie felter skal i databasen som null, ikke som "". "Ikke udfyldt"
// må kun have én repræsentation, ellers skal alt, der læser feltet bagefter,
// huske at tjekke begge dele.
export function tomTilNull(vaerdi: string): string | null {
  return vaerdi === "" ? null : vaerdi;
}
