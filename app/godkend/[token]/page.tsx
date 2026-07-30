import type { Metadata } from "next";
import { BeslutningSide } from "@/components/lokalebooking/beslutning-side";
import { findBookingViaToken } from "@/features/lokalebooking/beslutning";
import { afgoerMedToken } from "@/features/lokalebooking/token-handlinger";

// Godkendelseslinket fra notifikationsmailen.
//
// Ruten ligger uden for /admin og er derfor ikke bag login. Det er meningen: den
// cafeteriaansvarlige skal kunne trykke fra sin telefon uden at kende et kodeord.
// Tokenet i adressen er adgangen, og det er 256 tilfældige bit.
//
// Denne side ændrer ingenting. Den viser kun, hvad der skal tages stilling til —
// beslutningen sker først, når knappen trykkes, og det er et POST. Mailklienter
// og sikkerhedsfiltre henter links på forhånd, og uden den opdeling kunne en
// booking blive godkendt, uden at et menneske havde set den.

type GodkendPageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Godkend booking · Vejle Boldklub",
  robots: { index: false, follow: false },
};

export default async function GodkendPage({ params }: GodkendPageProps) {
  const { token } = await params;
  const booking = await findBookingViaToken("godkend", token);

  return (
    <BeslutningSide
      art="godkend"
      booking={booking}
      handling={afgoerMedToken.bind(null, "godkend", token)}
    />
  );
}
