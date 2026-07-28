import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaaltavleTabel } from "@/components/baneplan/maaltavle";
import { baneplaner, findBaneplan } from "@/features/baneplan/plans";
import { hentOffentligLivePlan } from "@/features/baneplan/public-plan";
import ScheduleView from "@/app/admin/baneplan/[plan]/schedule-view";

type OffentligBaneplanPageProps = {
  params: Promise<{ plan: string }>;
};

export function generateStaticParams() {
  return baneplaner.map((plan) => ({ plan: plan.slug }));
}

// Siden caches og fornyes hver time. publicerKladde kalder revalidatePath på den
// offentlige sti, så en nypubliceret plan slår igennem med det samme; timen er
// kun et net under det.
export const revalidate = 3600;

export async function generateMetadata({ params }: OffentligBaneplanPageProps): Promise<Metadata> {
  const { plan: slug } = await params;
  const plan = findBaneplan(slug);
  return {
    title: plan ? `Baneplan ${plan.name} · VB Parken` : "Baneplan",
    // Siden vises i en iframe i klubbens CMS og skal ikke konkurrere med den
    // side om søgeresultater.
    robots: { index: false, follow: false },
  };
}

export default async function OffentligBaneplanPage({ params }: OffentligBaneplanPageProps) {
  const { plan: slug } = await params;
  const plan = findBaneplan(slug);

  if (!plan) {
    notFound();
  }

  const live = await hentOffentligLivePlan(plan.slug);

  // Ingen synlig header. Siden ligger i en iframe, hvor CMS'et leverer logo og
  // overskrift, og header-blokken er af samme grund fjernet fra legacy-siderne.
  // Overskriften er kun til skærmlæsere.
  return (
    <main className="min-h-screen bg-white px-3 py-3 text-slate-950 sm:px-4 sm:py-4">
      <h1 className="sr-only">
        Baneplan {plan.name}
        {live?.saesontitel ? ` — ${live.saesontitel}` : ""}
      </h1>

      {live ? (
        <>
          <ScheduleView fields={live.data.fields} events={live.data.events} />
          {live.data.maaltavle && (
            <MaaltavleTabel maaltavle={live.data.maaltavle} fields={live.data.fields} />
          )}
        </>
      ) : (
        <p className="mx-auto max-w-md py-16 text-center text-sm leading-6 text-slate-600">
          Der er endnu ikke publiceret en baneplan for {plan.name}.
        </p>
      )}
    </main>
  );
}
