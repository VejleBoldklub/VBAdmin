import Image from "next/image";
import { redirect } from "next/navigation";
import { Inaktivitetsvagt } from "@/components/inaktivitetsvagt";
import { ModuleCard, type ModuleCardProps } from "@/components/module-card";
import { hentBruger, harAdgangTil, type Modul } from "@/lib/adgang";
import { logUd } from "@/app/login/actions";

// Forsiden viser, hvem der er logget ind, og kræver derfor en session.
export const dynamic = "force-dynamic";

// Historik er med vilje ikke på listen. Modulet er stadig planlagt — det står i
// SYSTEM.md som Fase 4 — men et kort, der hverken kan klikkes eller siger noget
// om hvornår, fylder kun på en forside, klubben ser hver dag. Det sættes ind
// igen, når der er noget at gå ind til.
//
// Numrene er rækkefølge, ikke identitet. De skal løbe uden huller, ellers ligner
// forsiden en fejl.
//
// modul er nøglen i allowed_modules. Administration har ingen: adgangen dertil
// følger rollen, ikke en modulliste.
type Modulkort = ModuleCardProps & { modul?: Modul; kunAdministrator?: boolean };

const modules: Modulkort[] = [
  {
    title: "Baneplan",
    description: "Administrér klubbens baneplaner.",
    status: "Aktiv",
    href: "/admin/baneplan",
    index: 1,
    modul: "baneplan",
  },
  {
    title: "Lokalebooking",
    description: "Se og godkend bookinger af mødelokalet og cafeteriet.",
    status: "Aktiv",
    href: "/admin/lokalebooking",
    index: 2,
    modul: "lokalebooking",
  },
  {
    title: "Infoskærm Cafeteria",
    description: "Administrer kostplaner og Infoskærm",
    status: "Aktiv",
    href: "/admin/infoskaerm",
    index: 3,
    modul: "infoskaerm",
  },
  {
    title: "Administration",
    description: "Administrér brugere, roller og systemindstillinger.",
    status: "Aktiv",
    href: "/admin/administration",
    index: 4,
    kunAdministrator: true,
  },
];

export default async function Home() {
  const bruger = await hentBruger();

  // proxy.ts har allerede sendt den uden session til /login. Kontrollen her er
  // for det tilfælde, at matcheren en dag ikke længere dækker forsiden — og
  // fordi resten af siden ikke giver mening uden en bruger.
  if (!bruger) redirect("/login");

  // Alle moduler vises for alle. De, brugeren ikke må åbne, er nedtonet med et
  // hængelås frem for skjult: klubben skal kunne se, hvad systemet indeholder,
  // og en tom forside ville se ud som om noget manglede.
  //
  // At kortet er synligt giver ingen adgang. proxy.ts afviser ruten, og hver
  // handling kontrollerer sig selv.
  const kort = modules.map((m) => ({
    ...m,
    laast: m.kunAdministrator
      ? bruger.rolle !== "admin"
      : m.modul
        ? !harAdgangTil(bruger, m.modul)
        : false,
  }));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
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

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{bruger.email}</span>
            <form action={logUd}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                Log ud
              </button>
            </form>
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
            {kort.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 py-5 text-xs text-slate-500">
          © {new Date().getFullYear()} Vejle Boldklub
        </footer>
      </div>

      {/* Forsiden ligger uden for /admin og dækkes derfor ikke af
          app/admin/layout.tsx. Den kræver login som resten af adminfladen, og
          det er den side, der oftest bliver stående åben. */}
      <Inaktivitetsvagt />
    </main>
  );
}
