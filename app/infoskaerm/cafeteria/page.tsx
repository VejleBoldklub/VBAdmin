import { supabasePublic } from "@/lib/supabase-public";
import { getTodayPlan } from "@/lib/infoskaerm/data";
import { DAY_CONTENT, farveTilNavn, type DagFarve } from "@/lib/infoskaerm/content";
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

export default async function CafeteriaInfoskaermPage() {
  const row = await getTodayPlan(supabasePublic());
  const farve: DagFarve = row?.farve ?? "Grøn";

  return (
    <ScreenView
      initial={{
        farve,
        navn: farveTilNavn(farve),
        ekstraBesked: row?.ekstra_besked ?? "",
        content: DAY_CONTENT[farve],
      }}
    />
  );
}
