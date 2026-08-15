import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { supabaseSession } from "@/lib/supabase-session";
import KodeForm from "./kode-form";

// Her lander en inviteret bruger efter /auth/bekraeft.
//
// Ruten ligger uden for matcheren i proxy.ts: brugeren har en session fra
// invitationslinket, men endnu ingen adgangskode, og skal kunne komme hertil,
// selv om der ikke er givet moduladgang endnu.
export const dynamic = "force-dynamic";

export default async function OpretAdgangskodePage() {
  const klient = await supabaseSession();

  const {
    data: { user },
  } = await klient.auth.getUser();

  // Uden session er der ingen bruger at sætte en kode på. Så er linket brugt
  // eller udløbet, og login er det rigtige sted at være.
  if (!user) redirect("/login");

  return (
    <AuthShell
      title="Vælg din adgangskode"
      undertitel="Første gang du logger ind, skal du vælge din egen adgangskode. Mindst 10 tegn."
    >
      <p className="mt-4 text-sm text-slate-600">
        Bruger: <span className="font-semibold text-slate-950">{user.email}</span>
      </p>

      <KodeForm />
    </AuthShell>
  );
}
