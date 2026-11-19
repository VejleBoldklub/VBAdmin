import { NextResponse, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase-public";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hentPlayerData } from "@/lib/signage/data";
import { SLUG_FORM } from "@/lib/signage/typer";

// Skærmens opdateringskald. Playeren henter ruten med det interval, skærmen er
// sat op til, så ændringer i Skærme Alliancen slår igennem uden genindlæsning.
//
// Ruten er offentlig som selve playeren og læser med anon-nøglen bag
// rækkesikkerheden. Det eneste, den skriver, er skærmens "sidst set", og det
// sker med service_role, så anon ikke skal have nogen skriveret.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_FORM.test(slug)) return NextResponse.json({ ok: false, fejl: "Ukendt skærm." }, { status: 404 });

  try {
    const data = await hentPlayerData(supabasePublic(), slug);
    if (!data) return NextResponse.json({ ok: false, fejl: "Ukendt skærm." }, { status: 404 });

    // Forhåndsvisningen fra adminfladen tæller ikke som et livstegn fra
    // skærmen — ellers ville en slukket skærm se tændt ud, når nogen kiggede.
    if (req.nextUrl.searchParams.get("forhaand") !== "1") {
      const { error } = await supabaseAdmin
        .from("signage_skaerme")
        .update({ sidst_set: new Date().toISOString() })
        .eq("id", data.skaerm.id);
      if (error) console.error("Signage: kunne ikke gemme livstegn:", error);
    }

    return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Signage: playlisten kunne ikke hentes:", err);
    return NextResponse.json({ ok: false, fejl: "Playlisten kunne ikke hentes." }, { status: 500 });
  }
}
