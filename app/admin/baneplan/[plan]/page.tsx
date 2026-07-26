import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { baneplaner, findBaneplan } from "@/features/baneplan/plans";

type BaneplanAdminPageProps = {
  params: Promise<{ plan: string }>;
};

export function generateStaticParams() {
  return baneplaner.map((plan) => ({ plan: plan.slug }));
}

export default async function BaneplanAdminPage({ params }: BaneplanAdminPageProps) {
  const { plan: slug } = await params;
  const plan = findBaneplan(slug);

  if (!plan) {
    notFound();
  }

  return (
    <AdminPageShell eyebrow={`Baneplan · ${plan.name}`} title={plan.seasonTitle}>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-950">Næste udviklingstrin</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Denne administration er klargjort, men ændrer endnu ikke den offentlige baneplan.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {["Upload af Excel fra KlubOffice", "Validering af tider og baner", "Sammenligning og preview", "Kontrolleret publicering", "Historik og gendannelse"].map((item) => (
            <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/baneplan"
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Tilbage til baneplaner
          </Link>
          <Link
            href={plan.publicPath}
            className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            Åbn offentlig side
          </Link>
        </div>
      </div>
    </AdminPageShell>
  );
}
