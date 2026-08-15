import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { hentBruger } from "@/lib/adgang";
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

  return (
    <AuthShell title="Log ind" undertitel="Brug din klubadresse og din egen adgangskode.">
      <LoginForm videre={videre} />
    </AuthShell>
  );
}
