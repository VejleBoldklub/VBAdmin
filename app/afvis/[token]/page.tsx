import type { Metadata } from "next";
import { BeslutningSide } from "@/components/lokalebooking/beslutning-side";
import { findBookingViaToken } from "@/features/lokalebooking/beslutning";
import { afgoerMedToken } from "@/features/lokalebooking/token-handlinger";

// Afvisningslinket fra notifikationsmailen. Samme opdeling som /godkend: siden
// viser, beslutningen sker først ved et tryk. Her kan der desuden skrives en
// begrundelse, som bookeren får i afslagsmailen — feltet er valgfrit, præcis som
// i adminfladen.

type AfvisPageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Afvis booking · Vejle Boldklub",
  robots: { index: false, follow: false },
};

export default async function AfvisPage({ params }: AfvisPageProps) {
  const { token } = await params;
  const booking = await findBookingViaToken("afvis", token);

  return (
    <BeslutningSide
      art="afvis"
      booking={booking}
      handling={afgoerMedToken.bind(null, "afvis", token)}
    />
  );
}
