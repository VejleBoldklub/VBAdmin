import { NextResponse, type NextRequest } from "next/server";
import { supabaseSession } from "@/lib/supabase-session";

// Landingen for linket i invitationsmailen.
//
// Supabase kan sende brugeren hertil på to måder, afhængigt af hvordan
// mailskabelonen er sat op:
//
//   ?token_hash=...&type=invite   når skabelonen bruger {{ .TokenHash }}
//   ?code=...                     PKCE-flowet
//
// Begge understøttes, fordi valget ligger i Supabase-dashboardet og ikke i
// koden. Den vej, der IKKE kan bruges, er standardskabelonens implicitte flow:
// den lægger tokenet efter et #, og et fragment sendes aldrig til serveren.
// Skabelonen skal derfor pege herpå med token_hash.
//
// Ruten ligger uden for matcheren i proxy.ts. Den er selve vejen til at få en
// session og kan derfor ikke selv kræve en.
export const dynamic = "force-dynamic";

function tilFejl(req: NextRequest, grund: string) {
  const maal = req.nextUrl.clone();
  maal.pathname = "/login";
  maal.search = `?fejl=${encodeURIComponent(grund)}`;

  return NextResponse.redirect(maal);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokenHash = sp.get("token_hash");
  const type = sp.get("type");
  const code = sp.get("code");

  // Kun en sti på vores eget domæne. Ellers kunne linket i en mail sende en
  // netop indlogget bruger videre til en fremmed side.
  const raaVidere = sp.get("next") ?? "/opret-adgangskode";
  const videre =
    raaVidere.startsWith("/") && !raaVidere.startsWith("//") ? raaVidere : "/opret-adgangskode";

  const klient = await supabaseSession();

  if (tokenHash && type) {
    const { error } = await klient.auth.verifyOtp({
      token_hash: tokenHash,
      // Typen kommer fra Supabase' eget link. Er den ukendt, afviser verifyOtp.
      type: type as "invite" | "recovery" | "email",
    });

    if (error) {
      console.error("Kunne ikke bekræfte invitationslink:", error.message);
      return tilFejl(req, "Linket er udløbet eller allerede brugt. Bed om en ny invitation.");
    }
  } else if (code) {
    const { error } = await klient.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Kunne ikke indløse kode fra invitationslink:", error.message);
      return tilFejl(req, "Linket er udløbet eller allerede brugt. Bed om en ny invitation.");
    }
  } else {
    return tilFejl(req, "Linket manglede oplysninger. Bed om en ny invitation.");
  }

  const maal = req.nextUrl.clone();
  maal.pathname = videre;
  maal.search = "";

  return NextResponse.redirect(maal);
}
