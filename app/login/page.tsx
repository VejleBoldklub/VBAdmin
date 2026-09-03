import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { hentBruger } from "@/lib/adgang";
import { INAKTIVITET_MINUTTER } from "@/lib/inaktivitet";
import LoginForm from "./login-form";

// Ruten er offentlig og ligger uden for matcheren i proxy.ts. Ellers kunne
// ingen komme ind.
export const dynamic = "force-dynamic";

type LoginProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  // Er man allerede logget ind, er der ikke noget at lave her.
  if (await hentBruger()) redirect("/");

  const sp = await searchParams;
  const raa = sp.videre;
  const videre = typeof raa === "string" && raa.startsWith("/") && !raa.startsWith("//") ? raa : "/";

  // /auth/bekraeft sender hertil med ?fejl=, når et invitations- eller
  // nulstillingslink er udløbet eller allerede brugt. Uden dette blev beskeden
  // sat i adressen og aldrig vist — brugeren så bare en almindelig loginside og
  // forstod ikke, hvorfor linket ikke virkede.
  const fejl = typeof sp.fejl === "string" ? sp.fejl : null;

  // Sat af logUdVedInaktivitet. Et flag, ikke en tekst: beskeden står her, så
  // adressen ikke kan bruges til at få vist en vilkårlig besked på loginsiden.
  const inaktiv = sp.inaktiv === "1";

  return (
    <AuthShell title="Log ind" undertitel="Brug din klubadresse og din egen adgangskode.">
      {inaktiv && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
        >
          Du blev logget ud, fordi der ikke skete noget på siden i{" "}
          {INAKTIVITET_MINUTTER} minutter. Log ind igen for at fortsætte.
        </p>
      )}

      {fejl && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          {fejl}
        </p>
      )}

      <LoginForm videre={videre} />

      <Link
        href="/glemt-kodeord"
        className="mt-5 inline-block text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      >
        Glemt adgangskode?
      </Link>
    </AuthShell>
  );
}
