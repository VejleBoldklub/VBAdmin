import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { kraevAdministrator } from "@/lib/adgang";
import { hentBrugere } from "@/lib/administration";
import BrugerRaekke from "./bruger-raekke";
import InviterForm from "./inviter-form";

// Brugere, roller og moduladgang.
//
// Siden følger rollen, ikke allowed_modules — se lib/adgang.ts. proxy.ts holder
// allerede andre end administratorer ude, men siden kontrollerer det selv, så
// den ikke hviler på, at matcheren i proxy.ts bliver ved med at dække ruten.
export const dynamic = "force-dynamic";

export default async function AdministrationPage() {
  const mig = await kraevAdministrator();
  if (!mig) redirect("/ingen-adgang");

  const { brugere, fejl } = await hentBrugere();

  return (
    <AdminPageShell eyebrow="Administration" title="Brugere">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Hvem der har adgang til hvad. En administrator har adgang til alle moduler og til denne
        side. En bruger har adgang til præcis de moduler, der er sat flueben ved.
      </p>

      {fejl && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-bold">Brugerlisten kunne ikke hentes.</p>
          <p className="mt-1 font-mono text-xs leading-5 break-words">{fejl}</p>
          <p className="mt-2">
            Findes tabellen ikke, mangler migrationen{" "}
            <code className="font-mono">supabase/administration-brugere.sql</code> at blive kørt i
            Supabase.
          </p>
        </div>
      )}

      <InviterForm />

      <h2 className="mt-10 text-lg font-bold tracking-tight">
        Brugere <span className="font-normal text-slate-500">({brugere.length})</span>
      </h2>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {brugere.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Der er ingen brugere endnu. Det er usædvanligt — du er selv logget ind, så din egen
            række burde stå her.
          </p>
        ) : (
          brugere.map((bruger) => (
            <BrugerRaekke
              key={bruger.authUserId}
              bruger={bruger}
              erMigSelv={bruger.authUserId === mig.authUserId}
            />
          ))
        )}
      </div>
    </AdminPageShell>
  );
}
