import Image from "next/image";
import { ModuleCard, type ModuleCardProps } from "@/components/module-card";

const modules: ModuleCardProps[] = [
  {
    title: "Baneplan",
    description: "Administrér klubbens baneplaner.",
    status: "Klar til næste fase",
    index: 1,
  },
  {
    title: "Lokalebooking",
    description: "Administrér klubbens lokaler og bookinger.",
    status: "Kommer senere",
    index: 2,
  },
  {
    title: "Historik",
    description: "Se tidligere udgivelser og ændringer.",
    status: "Kommer senere",
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
              width={1291}
              height={1237}
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
            <p className="hidden text-sm text-slate-500 sm:block">4 moduler</p>
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
