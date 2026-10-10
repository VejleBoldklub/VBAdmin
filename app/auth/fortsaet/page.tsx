import { AuthShell } from "@/components/auth-shell";

// Mellemsiden mellem mailen og /auth/bekraeft.
//
// Linket i en invitation virker kun én gang. Mailprogrammer, virusscannere og
// indbyggede browsere i mail-apps åbner ofte linket i baggrunden, før brugeren
// selv trykker — og så er det brugt, når brugeren kommer. Derfor bekræfter et
// GET af linket ingenting. Det lander her, og først et tryk på knappen sender
// tokenet til /auth/bekraeft som POST. En scanner følger links, men trykker
// ikke på knapper.
//
// Ruten ligger under /auth og dermed uden for matcheren i proxy.ts.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function enkelt(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function FortsaetPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tokenHash = enkelt(sp.token_hash);
  const type = enkelt(sp.type);
  const videre = enkelt(sp.next) || "/opret-adgangskode";

  const erNulstilling = type === "recovery";

  return (
    <AuthShell
      title={erNulstilling ? "Nulstil din adgangskode" : "Velkommen til Vejle Boldklub Admin"}
      undertitel={
        erNulstilling
          ? "Tryk på knappen for at vælge en ny adgangskode."
          : "Tryk på knappen for at vælge din adgangskode og komme ind."
      }
    >
      <form method="post" action="/auth/bekraeft" className="mt-5">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={videre} />
        <button
          type="submit"
          className="w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          {erNulstilling ? "Vælg ny adgangskode" : "Vælg adgangskode"}
        </button>
      </form>
    </AuthShell>
  );
}
