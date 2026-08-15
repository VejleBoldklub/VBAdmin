import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { hentBruger } from "@/lib/adgang";
import { logUd } from "@/app/login/actions";

// Logget ind, men uden adgang til det, der blev forsøgt åbnet.
//
// En egen side frem for en fejlside: det er ikke en fejl, at Helene ikke må
// åbne baneplanen, og en 403 ville se ud som om noget var i stykker.
export const dynamic = "force-dynamic";

export default async function IngenAdgangPage() {
  const bruger = await hentBruger();

  return (
    <AuthShell
      title="Ingen adgang"
      undertitel={
        bruger
          ? "Din bruger har ikke adgang til den side. Er det en fejl, så sig til, så kan adgangen ændres under Administration."
          : "Din bruger er oprettet, men har ikke fået adgang til noget endnu."
      }
    >
      {bruger && (
        <p className="mt-4 text-sm text-slate-600">
          Logget ind som <span className="font-semibold text-slate-950">{bruger.email}</span>.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
        >
          Til forsiden
        </Link>

        <form action={logUd}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Log ud
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
