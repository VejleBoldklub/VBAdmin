import Image from "next/image";
import { ModuleCard, type ModuleCardProps } from "@/components/module-card";

// Historik er med vilje ikke på listen. Modulet er stadig planlagt — det står i
// SYSTEM.md som Fase 4 — men et kort, der hverken kan klikkes eller siger noget
// om hvornår, fylder kun på en forside, klubben ser hver dag. Det sættes ind
// igen, når der er noget at gå ind til.
//
// Numrene er rækkefølge, ikke identitet. De skal løbe uden huller, ellers ligner
// forsiden en fejl.
const modules: ModuleCardProps[] = [
  {
    title: "Baneplan",
    description: "Administrér klubbens baneplaner.",
    status: "Aktiv",
    href: "/admin/baneplan",
    index: 1,
  },
  {
    title: "Lokalebooking",
    description: "Se og godkend bookinger af mødelokalet og cafeteriet.",
    status: "Aktiv",
    href: "/admin/lokalebooking",
    index: 2,
  },
  {
    title: "Infoskærm Cafeteria",
    description: "Sæt farve og besked på cafeteriets infoskærm.",
    status: "Aktiv",
    href: "/admin/infoskaerm",
    index: 3,
  },
  {
    title: "Administration",
    description: "Administrér brugere, roller og systemindstillinger.",
    status: "Kommer senere",
    index: 4,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center border-b border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            <Image
              src="/vb-logo.png"
              alt="Vejle Boldklub"
              width={500}
              height={500}
              priority
              className="h-14 w-auto object-contain sm:h-16"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Klubportal</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Vejle Boldklub Admin
              </h1>
            </div>
          </div>
        </header>

        <section className="py-8 sm:py-10" aria-labelledby="modules-title">
          <div className="mb-5 flex items-end justify-between gap-6">
            <div>
              <h2 id="modules-title" className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Vælg et modul
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">Administrative værktøjer samles her, efterhånden som de bliver klar.</p>
            </div>
            {/* Tælles frem for at stå som et tal. Et fast tal ville modsige
                kortene, næste gang listen ændrer sig. */}
            <p className="hidden text-sm text-slate-500 sm:block">
              {modules.length} moduler
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 py-5 text-xs text-slate-500">
          © {new Date().getFullYear()} Vejle Boldklub
        </footer>
      </div>
    </main>
  );
}
