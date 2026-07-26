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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between gap-6 border-b border-slate-200 pb-7">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="h-10 w-1 rounded-full bg-red-700" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-700">Vejle Boldklub</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Administration</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
            Fundament
          </span>
        </header>

        <section className="py-14 sm:py-18 lg:py-20" aria-labelledby="dashboard-title">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-700">Dashboard</p>
            <h1 id="dashboard-title" className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Vejle Boldklub Admin
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Klubbens fælles indgang til administrative værktøjer. Moduler aktiveres ét ad gangen, når de er klar.
            </p>
          </div>
        </section>

        <section className="pb-16" aria-labelledby="modules-title">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">Overblik</p>
              <h2 id="modules-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Moduler
              </h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">4 moduler</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {modules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 py-6 text-sm text-slate-500">
          © {new Date().getFullYear()} Vejle Boldklub
        </footer>
      </div>
    </main>
  );
}
