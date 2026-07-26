import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AdminPageShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
};

export function AdminPageShell({ children, eyebrow, title }: AdminPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between gap-5 border-b border-slate-200 pb-5">
          <Link
            href="/"
            className="flex items-center gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            <Image
              src="/vb-logo.png"
              alt="Vejle Boldklub"
              width={1291}
              height={1237}
              priority
              className="h-12 w-auto object-contain sm:h-14"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Klubportal</p>
              <p className="mt-1 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Vejle Boldklub Admin</p>
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Forside
          </Link>
        </header>

        <section className="py-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
