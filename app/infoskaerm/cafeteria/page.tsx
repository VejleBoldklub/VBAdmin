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
  const farve: DagFarve = row?.farve ?? "Grøn";

  // Kostindholdet redigeres fra adminfladen og hentes derfor med. Kan det ikke
  // hentes, falder getIndhold tilbage til de hardcodede værdier.
  const content = await getIndhold(client, farve);

  return (
    <ScreenView
      initial={{
        farve,
        navn: content.shortName,
        ekstraBesked: row?.ekstra_besked ?? "",
        content,
      }}
    />
  );
}
