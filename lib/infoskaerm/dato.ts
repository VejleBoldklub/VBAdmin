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
