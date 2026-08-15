import { supabasePublic } from "@/lib/supabase-public";
import { getIndhold, getTodayPlan } from "@/lib/infoskaerm/data";
import type { DagFarve } from "@/lib/infoskaerm/content";
import ScreenView from "./screen-view";

// Cafeteriets infoskærm. Kiosk-pc'en peger på denne rute.
//
// Ruten er offentlig med vilje — skærmen har ingen at logge ind. Den er derfor
// ikke omfattet af matcheren i proxy.ts, og den læser med anon-nøglen bag
// rækkesikkerheden, ikke med service_role. Der er intet følsomt på siden: en
// farve og en besked om dagens kost.
//
// Som de øvrige offentlige ruter tegner siden ikke klubbens adminlayout. Her er
// grunden en anden end i baneplanen og lokalebookingen: siden er ikke i en
// iframe, den er hele skærmbilledet på en kiosk.
export const dynamic = "force-dynamic";

// Fanebladets titel på kiosk-pc'en. Resten af appen arver den globale titel fra
// app/layout.tsx, men her er browseren i fuld skærm hele dagen, og titlen er det
// eneste, der adskiller fanen, hvis nogen skal finde tilbage til den.
export const metadata = {
  title: "Infoskærm Cafeteria — Vejle Boldklub",
};

export default async function CafeteriaInfoskaermPage() {
  const client = supabasePublic();

  const row = await getTodayPlan(client);

  // Ingen farve sat for dagen: skærmen siger det frem for at vise et kostkort,
  // ingen har valgt. En reserve her ville skjule en glemt indtastning — det så
  // ud som en plan, og så opdagede ingen, at der ikke var nogen.
  if (!row) {
    return <ScreenView initial={{ harPlan: false }} />;
  }

  const farve: DagFarve = row.farve;

  // Kostindholdet redigeres fra adminfladen og hentes derfor med. Kan det ikke
  // hentes, falder getIndhold tilbage til de hardcodede værdier. Den reserve
  // bliver: teksterne er indholdet i et valgt kort, ikke selve valget.
  const content = await getIndhold(client, farve);

  return (
    <ScreenView
      initial={{
        harPlan: true,
        farve,
        navn: content.shortName,
        ekstraBesked: row.ekstra_besked,
        content,
      }}
    />
  );
}
