const modules = [
  {
    title: "Baneplan",
    description: "Få overblik over træningstider og baner.",
    icon: "▦",
  },
  {
    title: "Lokalebooking",
    description: "Book og administrer klubbens lokaler.",
    icon: "⌂",
  },
  {
    title: "Historik",
    description: "Se tidligere aktiviteter og ændringer.",
    icon: "↶",
  },
  {
    title: "Administration",
    description: "Håndter brugere, roller og indstillinger.",
    icon: "⚙",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-red-950/80 to-transparent" />
        <div className="absolute -right-40 top-24 -z-10 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />

        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
          <header className="flex items-center gap-4 border-b border-white/10 pb-8">
            <div
              aria-label="VB-logo placeholder"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-red-700 text-xl font-black tracking-tight shadow-lg shadow-red-950/40 ring-1 ring-white/20"
            >
              VB
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">Klubportal</p>
              <p className="mt-1 text-sm text-slate-400">Vejle Boldklub</p>
            </div>
          </header>

          <section className="flex flex-1 flex-col justify-center py-16 sm:py-20">
            <div className="mb-10 max-w-3xl sm:mb-14">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-red-500">Velkommen</p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Vejle Boldklub <span className="text-red-600">Admin</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
                Ét samlet sted til klubbens daglige planlægning og administration.
              </p>
            </div>

            <nav aria-label="Administrationsmoduler" className="grid gap-4 sm:grid-cols-2 lg:gap-6">
              {modules.map((module, index) => (
                <a
                  key={module.title}
                  href="#"
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-red-600/60 hover:bg-slate-900 hover:shadow-2xl hover:shadow-red-950/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 sm:p-8"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <span className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-red-700/15 text-2xl text-red-400 ring-1 ring-red-600/20 transition group-hover:bg-red-700 group-hover:text-white">
                        {module.icon}
                      </span>
                      <h2 className="text-xl font-bold sm:text-2xl">{module.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">{module.description}</p>
                    </div>
                    <span className="text-2xl text-slate-600 transition group-hover:translate-x-1 group-hover:text-red-500" aria-hidden="true">
                      →
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-red-700 transition-transform duration-300 group-hover:scale-x-100" />
                  <span className="absolute right-5 top-4 -z-10 text-7xl font-black text-white/[0.025]">0{index + 1}</span>
                </a>
              ))}
            </nav>
          </section>

          <footer className="border-t border-white/10 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} Vejle Boldklub
          </footer>
        </div>
      </div>
    </main>
  );
}
