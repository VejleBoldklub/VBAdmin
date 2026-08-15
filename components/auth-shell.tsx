import Image from "next/image";
import type { ReactNode } from "react";

// Rammen om login og de øvrige sider uden for adminfladen.
//
// Bevidst ikke AdminPageShell: den har en "Forside"-genvej og et layout, der
// forudsætter, at man er kommet ind. Her er man netop ikke inde endnu.
export function AuthShell({
  children,
  title,
  undertitel,
}: {
  children: ReactNode;
  title: string;
  undertitel?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/vb-logo.png"
            alt="Vejle Boldklub"
            width={1291}
            height={1237}
            priority
            className="h-12 w-auto object-contain"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Klubportal</p>
            <p className="mt-0.5 text-base font-bold tracking-tight">Vejle Boldklub Admin</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {undertitel && <p className="mt-2 text-sm leading-6 text-slate-600">{undertitel}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
