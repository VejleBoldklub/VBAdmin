import Image from "next/image";
import Link from "next/link";
import type { Baneplan } from "@/features/baneplan/plans";

type PublicBaneplanPlaceholderProps = {
  plan: Baneplan;
};

export function PublicBaneplanPlaceholder({ plan }: PublicBaneplanPlaceholderProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10 text-slate-950">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <Image
          src="/vb-logo.png"
          alt="Vejle Boldklub"
          width={1291}
          height={1237}
          priority
          className="mx-auto h-20 w-auto object-contain"
        />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-red-700">Baneplan · {plan.name}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{plan.seasonTitle}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">
          Den permanente side er oprettet. Den færdige visuelle baneplan tilføjes i næste udviklingstrin.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Til Vejle Boldklub Admin
        </Link>
      </section>
    </main>
  );
}
