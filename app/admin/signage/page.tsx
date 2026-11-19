import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { produktionsBaseUrl } from "@/lib/base-url";
import { hentMedier, hentSkaerme, manglerTabel } from "@/lib/signage/data";
import KopierFelt from "./kopier-felt";
import NySkaerm from "./ny-skaerm";
import { ETIKET, KNAP, KORT, OpsaetningMangler, SignageShell, StatusPrik, erOnline, sidstSetTekst } from "./ui";

// Skærme Alliancen: overblikket over alle klubbens skærme.
//
// Ruten ligger under /admin og kræver modulet 'signage' (eller rollen admin)
// i proxy.ts. Handlingerne kontrollerer derudover selv adgangen.
export const dynamic = "force-dynamic";

export const metadata = { title: "Skærme Alliancen — Vejle Boldklub Admin" };

function tidspunkt(): number {
  return Date.now();
}

export default async function SignageOversigt() {
  const [{ skaerme, antal, fejl }, { medier }] = await Promise.all([
    hentSkaerme(supabaseAdmin),
    hentMedier(supabaseAdmin),
  ]);
  const base = await produktionsBaseUrl();
  const nu = tidspunkt();

  const online = skaerme.filter((s) => s.aktiv && erOnline(s, nu)).length;
  const elementer = Object.values(antal).reduce((a, b) => a + b, 0);

  return (
    <SignageShell titel="Operations Center" undertitel="Alle klubbens skærme samlet ét sted" design="A">
      {fejl && manglerTabel(fejl) && <OpsaetningMangler />}
      {fejl && !manglerTabel(fejl) && (
        <div className={`${KORT} border-red-500/50 text-red-200`}>Skærmene kunne ikke hentes: {fejl.message}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <section aria-label="Oversigt">
            <p className={ETIKET}>Oversigt / alle enheder</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tal titel="Registrerede skærme" tal={skaerme.length} note={skaerme.map((s) => s.navn).join(", ") || "Ingen endnu"} />
              <Tal titel="Online" tal={online} note={`${skaerme.length - online} offline eller slået fra`} />
              <Tal titel="Aktive elementer" tal={elementer} note="På tværs af alle playlister" />
              <Tal titel="Medier" tal={medier.length} note="Billeder og videoer i biblioteket" />
            </div>
          </section>

          <section className={KORT} aria-label="Enhedsoversigt">
            <p className={ETIKET}>Enhedsoversigt</p>
            {skaerme.length === 0 && !fejl && (
              <p className="mt-4 text-sm text-slate-400">Der er ingen skærme endnu. Tilføj den første til højre.</p>
            )}
            <ul className="mt-3 divide-y divide-[#1e2a44]">
              {skaerme.map((s) => (
                <li key={s.id} className="grid gap-3 py-4 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
                  <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-[#b4122a] text-sm font-black">VB</div>
                  <div className="min-w-0">
                    <p className="font-bold text-white">{s.navn}</p>
                    <p className="text-xs text-slate-400">
                      {[s.placering, `${antal[s.id] ?? 0} aktive elementer`, sidstSetTekst(s)].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-2 max-w-xl">
                      <KopierFelt url={`${base}/signage/${s.slug}`} />
                    </div>
                  </div>
                  <StatusPrik skaerm={s} nu={nu} />
                  <Link href={`/admin/signage/skaerm/${s.id}`} className={KNAP}>
                    Administrér →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className={KORT}>
            <p className={ETIKET}>Tilføj skærm</p>
            <div className="mt-3">
              <NySkaerm />
            </div>
          </section>

          <section className={KORT}>
            <p className={ETIKET}>Hurtige handlinger</p>
            <div className="mt-3 grid gap-2">
              <Link href="/admin/signage/medier" className={KNAP}>
                ▣ Læg billeder og videoer op
              </Link>
              <Link href="/admin/signage/vejledning" className={KNAP}>
                ⚙ Sæt en skærm op
              </Link>
            </div>
          </section>

          <section className={KORT}>
            <p className={ETIKET}>Infoskærm Cafeteria</p>
            <p className="mt-2 text-sm text-slate-300">
              Kostplan, design og billeder til cafeteriet. Den samme skærm som under Infoskærm Cafeteria på forsiden, og
              den kan lægges ind i enhver playliste som et element.
            </p>
            <div className="mt-3 grid gap-2">
              <Link href="/admin/infoskaerm" className={KNAP}>
                Ugeplan og kost →
              </Link>
              <Link href="/admin/infoskaerm/design" className={KNAP}>
                Design skærmen →
              </Link>
              <Link href="/admin/infoskaerm/skaerm" className={KNAP}>
                Skærm og billeder →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </SignageShell>
  );
}

function Tal({ titel, tal, note }: { titel: string; tal: number; note: string }) {
  return (
    <div className={KORT}>
      <p className="text-sm text-slate-300">{titel}</p>
      <p className="mt-3 text-4xl font-black text-white">{tal}</p>
      <p className="mt-2 truncate text-xs text-slate-400">{note}</p>
    </div>
  );
}
