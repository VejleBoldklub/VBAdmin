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

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpretAdgangskodePage({ searchParams }: Props) {
  // Samme side dækker begge flows. Invitationen sender hertil uden parameter,
  // nulstillingen med ?nulstil=1. Kun teksten er forskellig — handlingen er den
  // samme, og en side mere ville skulle vedligeholdes to steder.
  const erNulstilling = (await searchParams).nulstil === "1";

  const klient = await supabaseSession();

  const {
    data: { user },
  } = await klient.auth.getUser();

  // Uden session er der ingen bruger at sætte en kode på. Så er linket brugt
  // eller udløbet, og login er det rigtige sted at være.
  if (!user) redirect("/login");

  return (
    <AuthShell
      title={erNulstilling ? "Vælg en ny adgangskode" : "Vælg din adgangskode"}
      undertitel={
        erNulstilling
          ? "Skriv din nye adgangskode. Mindst 10 tegn. Den gamle holder op med at virke med det samme."
          : "Første gang du logger ind, skal du vælge din egen adgangskode. Mindst 10 tegn."
      }
    >
      <p className="mt-4 text-sm text-slate-600">
        Bruger: <span className="font-semibold text-slate-950">{user.email}</span>
      </p>

      <KodeForm />
    </AuthShell>
  );
}
