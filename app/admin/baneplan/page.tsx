import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { baneplaner } from "@/features/baneplan/plans";

export default function BaneplanOverviewPage() {
  return (
    <AdminPageShell eyebrow="Baneplan" title="Administrér baneplaner">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        De to faste baneplaner genbruges hvert år. Sæsontitler og indhold ændres, mens de offentlige adresser forbliver de samme.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {baneplaner.map((plan) => (
          <article key={plan.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">{plan.name}</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">{plan.seasonTitle}</h2>
            <p className="mt-2 break-all text-xs text-slate-500">{plan.publicPath}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={plan.adminPath}
                className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
              >
                Administrér
              </Link>
              <Link
                href={plan.publicPath}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                Åbn offentlig side
              </Link>
            </div>
          </article>
        ))}
      </div>
    </AdminPageShell>
  );
}
