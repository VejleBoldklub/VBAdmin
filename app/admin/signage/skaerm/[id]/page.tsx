import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { produktionsBaseUrl } from "@/lib/base-url";
import { hentElementer, hentMedier, hentSkaerm, hentSkaerme } from "@/lib/signage/data";
import KopierFelt from "../../kopier-felt";
import { ETIKET, KNAP, KORT, SignageShell, StatusPrik, sidstSetTekst } from "../../ui";
import Indstillinger from "./indstillinger";
import Playliste from "./playliste";
import Forhaandsvisning from "./forhaandsvisning";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skærm — Skærme Alliancen" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tidspunkt(): number {
  return Date.now();
}

export default async function SkaermSide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [{ skaerm, fejl }, { elementer }, { medier }, { skaerme }] = await Promise.all([
    hentSkaerm(supabaseAdmin, id),
    hentElementer(supabaseAdmin, id),
    hentMedier(supabaseAdmin),
    hentSkaerme(supabaseAdmin),
  ]);

  if (fejl) throw new Error(fejl.message);
  if (!skaerm) notFound();

  const base = await produktionsBaseUrl();
  const forhaand = `/signage/${skaerm.slug}?forhaand=1`;

  return (
    <SignageShell
      titel={skaerm.navn}
      undertitel={[skaerm.placering, sidstSetTekst(skaerm)].filter(Boolean).join(" · ")}
      design="A"
      handling={<StatusPrik skaerm={skaerm} nu={tidspunkt()} />}
    >
      <Link href="/admin/signage" className="text-sm font-semibold text-slate-400 hover:text-white">
        ← Alle skærme
      </Link>

      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_440px]">
        <section className={KORT} aria-label="Playliste">
          <p className={ETIKET}>Playliste</p>
          <p className="mt-1 text-sm text-slate-400">
            Elementerne vises i rækkefølge og gentages. Et element med en plan vises kun, når planen passer. Ændringer
            slår igennem på skærmen inden for {skaerm.opdaterSekunder} sekunder.
          </p>
          <Playliste
            skaerm={skaerm}
            elementer={elementer}
            medier={medier}
            andreSkaerme={skaerme.filter((s) => s.id !== skaerm.id).map((s) => ({ id: s.id, navn: s.navn }))}
          />
        </section>

        <aside className="grid content-start gap-6">
          <section className={KORT}>
            <p className={ETIKET}>Live forhåndsvisning</p>
            <Forhaandsvisning src={forhaand} />
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={forhaand} target="_blank" rel="noreferrer" className={KNAP}>
                Åbn i fuld størrelse ↗
              </a>
            </div>
            <div className="mt-4">
              <p className={ETIKET}>Adresse til skærmen</p>
              <div className="mt-2">
                <KopierFelt url={`${base}/signage/${skaerm.slug}`} />
              </div>
            </div>
          </section>

          <section className={KORT}>
            <p className={ETIKET}>Skærmens indstillinger</p>
            <Indstillinger skaerm={skaerm} />
          </section>
        </aside>
      </div>
    </SignageShell>
  );
}
