// Kontrol af en dato, der kommer fra klienten.
//
// Formen tjekkes først, og derefter at det faktisk er en dato, der findes —
// "2026-02-31" har den rigtige form, men ruller over til 3. marts, hvis den bare
// sendes videre.
//
// Ligger her og ikke i en af handlingerne, fordi et "use server"-modul kun må
// eksportere handlinger, og både ugeplanen og billederne har brug for den.
const DATO_FORM = /^\d{4}-\d{2}-\d{2}$/;

export function erGyldigDato(dato: string): boolean {
  if (!DATO_FORM.test(dato)) return false;

  const [aar, maaned, dag] = dato.split("-").map(Number);
  const d = new Date(Date.UTC(aar, maaned - 1, dag));

  return (
    d.getUTCFullYear() === aar && d.getUTCMonth() === maaned - 1 && d.getUTCDate() === dag
  );
}

// Delt af ugeplanen under Infoskærm Cafeteria og "Dagens farve" i Skærme
// Alliancen, så de to lister altid viser de samme dage.
// Dagene regnes ud fra dagens dato i Europe/Copenhagen, ikke serverens.
//
// Vercel kører i UTC, og en liste bygget på serverens dato ville i timerne efter
// dansk midnat starte en dag for tidligt — mens getUpcomingPlan henter fra
// dagens danske dato. Listen ville så vise en dag, der ikke kunne hentes data
// til, og resten ville stå forskudt.
//
// Der regnes i hele døgn med Date.UTC frem for at lægge timer til, så
// sommertidsskiftet ikke kan give to ens eller en manglende dag.
export function dageFra(start: string, antal: number): string[] {
  const [aar, maaned, dag] = start.split("-").map(Number);

  return Array.from({ length: antal }, (_, i) =>
    new Date(Date.UTC(aar, maaned - 1, dag + i)).toISOString().slice(0, 10)
  );
}

export function labelFor(dato: string): string {
  // Middag UTC, så datoen ikke kan tippe til nabodøgnet under formateringen.
  return new Date(dato + "T12:00:00Z").toLocaleDateString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

