import { StatusMaerke } from "@/components/lokalebooking/status-maerke";
import { findLokale } from "@/features/lokalebooking/lokaler";
import { tidsrumDelt } from "@/features/lokalebooking/regler";
import type { Booking } from "@/features/lokalebooking/types";

// Den samlede liste. Ren visning uden tilstand, så den bliver på serveren —
// kontaktoplysningerne skal ikke længere ud end nødvendigt.

const CELLE = "px-3 py-2.5 align-top text-sm text-slate-700";
const OVERSKRIFT =
  "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600";

export default function BookingTabel({ bookinger }: { bookinger: Booking[] }) {
  if (bookinger.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
        Ingen bookinger matcher filtrene.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[880px] border-collapse">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={OVERSKRIFT}>Tidsrum</th>
            <th className={OVERSKRIFT}>Lokale</th>
            <th className={OVERSKRIFT}>Formål</th>
            <th className={OVERSKRIFT}>Hold</th>
            <th className={OVERSKRIFT}>Booker</th>
            <th className={OVERSKRIFT}>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookinger.map((booking) => {
            const { dag, klokke } = tidsrumDelt(
              new Date(booking.start_tid),
              new Date(booking.slut_tid)
            );
            const lokale = findLokale(booking.lokale);

            // Bemærkninger står på en linje for sig under bookingen frem for i en
            // kolonne. En fri besked kan være lang, og en kolonne til den ville
            // gøre alle rækker høje, også de mange uden besked.
            const bemaerkninger = [
              booking.besked ? { navn: "Besked", tekst: booking.besked } : null,
              booking.afvisningsgrund
                ? { navn: "Afvist fordi", tekst: booking.afvisningsgrund }
                : null,
            ].filter((b): b is { navn: string; tekst: string } => b !== null);

            return (
              <tr key={booking.id} className="border-b border-slate-100 last:border-b-0">
                <td className={CELLE}>
                  <span className="block whitespace-nowrap font-semibold text-slate-950">{dag}</span>
                  <span className="block whitespace-nowrap tabular-nums text-slate-600">
                    {klokke}
                  </span>
                  {bemaerkninger.length > 0 && (
                    <span className="mt-1.5 block max-w-xs text-xs leading-5 text-slate-600">
                      {bemaerkninger.map((b) => (
                        <span key={b.navn} className="block">
                          <span className="font-semibold">{b.navn}:</span> {b.tekst}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className={CELLE}>
                  <span className="whitespace-nowrap">{lokale?.navn ?? booking.lokale}</span>
                </td>
                <td className={CELLE}>{booking.formaal}</td>
                <td className={CELLE}>
                  {booking.hold ?? <span className="text-slate-400">—</span>}
                </td>
                <td className={CELLE}>
                  <span className="block font-medium text-slate-900">{booking.navn}</span>
                  <a
                    className="block break-all text-red-700 underline underline-offset-2"
                    href={`mailto:${booking.email}`}
                  >
                    {booking.email}
                  </a>
                  <a
                    className="block whitespace-nowrap text-red-700 underline underline-offset-2"
                    href={`tel:${booking.mobil}`}
                  >
                    {booking.mobil}
                  </a>
                </td>
                <td className={CELLE}>
                  <StatusMaerke status={booking.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
