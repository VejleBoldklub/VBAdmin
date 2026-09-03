import Link from "next/link";
import { AdminPageShell } from "@/components/admin-page-shell";
import { opretAdminBooking } from "@/features/lokalebooking/admin-opret";
import { lokaler } from "@/features/lokalebooking/lokaler";
import { danskTid, MAKS_MAANEDER_FREM } from "@/features/lokalebooking/regler";
import OpretBookingForm from "./opret-booking-form";

// Klubbens egen indgang til at oprette en booking.
//
// Den offentlige formular på /lokalebooking/<lokale> er urørt og skal blive ved
// med at være det: den ligger i en iframe på klubbens hjemmeside, den skriver med
// anon-nøglen bag rækkesikkerhed, og den kan kun én dato ad gangen. Gentagne
// bookinger kræver service_role — se begrundelsen øverst i admin-opret.ts — og
// hører derfor til her, bag login.
//
// Adgangen til ruten afgøres af proxy.ts, som allerede dækker /admin/:path*.
// Selve oprettelsen kontrollerer desuden sin egen adgang, fordi en server action
// kan rammes fra enhver rute i appen.

export const dynamic = "force-dynamic";

export default async function NyBookingPage() {
  const nu = new Date();
  const iDag = danskTid(nu);

  const seksMaanederFrem = new Date(nu.getTime());
  seksMaanederFrem.setUTCMonth(seksMaanederFrem.getUTCMonth() + MAKS_MAANEDER_FREM);

  return (
    <AdminPageShell eyebrow="Lokalebooking" title="Opret booking">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Bookinger oprettet her er bekræftet med det samme — også i cafeteriet. De skal ikke
        igennem godkendelseskøen, fordi de er lagt ind af den, der ellers skulle godkende dem.
        Bookeren får én kvitteringsmail.
      </p>

      <div className="mt-4">
        <Link
          href="/admin/lokalebooking"
          prefetch={false}
          className="text-sm font-semibold text-red-700 underline underline-offset-2 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          ← Tilbage til bookinglisten
        </Link>
      </div>

      <div className="mt-6">
        <OpretBookingForm
          // Kun det, formularen skal bruge. Lokalerne har også husregler og en
          // ansvarlig mailadresse, og de har intet at gøre i browserbundtet.
          lokaler={lokaler.map((l) => ({ slug: l.slug, navn: l.navn }))}
          iDag={iDag.dato}
          nuMinutter={iDag.minutter}
          maksDato={danskTid(seksMaanederFrem).dato}
          handling={opretAdminBooking}
        />
      </div>
    </AdminPageShell>
  );
}
