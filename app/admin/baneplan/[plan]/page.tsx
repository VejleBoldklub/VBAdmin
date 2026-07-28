import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { baneplaner, findBaneplan } from "@/features/baneplan/plans";
import { hentLivePlan, hentKladde, opretKladdeFraLive } from "@/features/baneplan/actions";
import ScheduleView from "./schedule-view";
import KladdeEditor from "./kladde-editor";

type BaneplanAdminPageProps = {
  params: Promise<{ plan: string }>;
};

export function generateStaticParams() {
  return baneplaner.map((plan) => ({ plan: plan.slug }));
}

export const dynamic = "force-dynamic";

export default async function BaneplanAdminPage({ params }: BaneplanAdminPageProps) {
  const { plan: slug } = await params;
  const plan = findBaneplan(slug);

  if (!plan) {
    notFound();
  }

  const [livePlan, kladde] = await Promise.all([
    hentLivePlan(plan.slug),
    hentKladde(plan.slug),
  ]);

  async function startKladde() {
    "use server";
    await opretKladdeFraLive(plan!.slug);
  }

  return (
    <AdminPageShell eyebrow={`Baneplan · ${plan.name}`} title={plan.seasonTitle} wide>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">Nuværende live-plan</h2>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
            Live
          </span>
        </div>

        {livePlan ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              {livePlan.saesontitel || "(ingen sæsontitel angivet)"}
            </p>
            <div className="mt-4">
              <ScheduleView fields={livePlan.data.fields} events={livePlan.data.events} />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Der er endnu ikke publiceret en live-plan for {plan.name}.
          </p>
        )}
      </div>

      {kladde ? (
        <KladdeEditor
          kladdeId={kladde.id}
          slug={plan.slug}
          initialSaesontitel={kladde.saesontitel}
          initialFields={kladde.data.fields}
          initialEvents={kladde.data.events}
          initialMaaltavle={kladde.data.maaltavle}
        />
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:p-6">
          <p className="text-sm text-slate-600">
            Ingen åben kladde. Opret en kladde for at redigere planen uden at påvirke den
            offentlige, gældende plan.
          </p>
          <form action={startKladde} className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              Opret kladde ud fra live-planen
            </button>
          </form>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/admin/baneplan"
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Tilbage til baneplaner
        </Link>
      </div>
    </AdminPageShell>
  );
}
