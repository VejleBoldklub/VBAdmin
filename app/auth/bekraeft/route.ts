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
// Et link med token_hash bekræftes ikke ved GET. Det sendes videre til
// mellemsiden /auth/fortsaet, og først dens knap sender tokenet hertil som
// POST. Ellers bruger mailscannere og forhåndsvisninger engangslinket op, før
// brugeren selv når at trykke — se app/auth/fortsaet/page.tsx.
//
// Ruten ligger uden for matcheren i proxy.ts. Den er selve vejen til at få en
// session og kan derfor ikke selv kræve en.
export const dynamic = "force-dynamic";

function tilFejl(req: NextRequest, grund: string) {
  const maal = req.nextUrl.clone();
  maal.pathname = "/login";
  maal.search = `?fejl=${encodeURIComponent(grund)}`;

  return NextResponse.redirect(maal, 303);
}

const TYPER = ["invite", "recovery", "email"] as const;
type OtpType = (typeof TYPER)[number];

function erType(v: unknown): v is OtpType {
  return typeof v === "string" && TYPER.some((t) => t === v);
}

// Kun en sti på vores eget domæne. Ellers kunne linket i en mail sende en
// netop indlogget bruger videre til en fremmed side.
function rensVidere(raa: unknown): string {
  return typeof raa === "string" && raa.startsWith("/") && !raa.startsWith("//")
    ? raa
    : "/opret-adgangskode";
}

// new URL frem for at sætte pathname.
//
// videre kan indeholde et query-parameter — nulstillingen sender
// "/opret-adgangskode?nulstil=1". Sættes den streng som pathname, koder
// URL-API'et spørgsmålstegnet ind i stien, og resultatet bliver
// "/opret-adgangskode%3Fnulstil=1", altså en 404.
//
// rensVidere har allerede sikret, at videre er en sti på vores eget domæne, så
// en relativ opløsning mod origin kan ikke føre ud af huset. 303, så browseren
// henter næste side med GET efter formularens POST.
function videreTil(req: NextRequest, videre: string) {
  return NextResponse.redirect(new URL(videre, req.nextUrl.origin), 303);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokenHash = sp.get("token_hash");
  const type = sp.get("type");
  const code = sp.get("code");

  if (tokenHash && type) {
    const maal = req.nextUrl.clone();
    maal.pathname = "/auth/fortsaet";
    maal.search = "";
    maal.searchParams.set("token_hash", tokenHash);
    maal.searchParams.set("type", type);
    maal.searchParams.set("next", rensVidere(sp.get("next")));

    return NextResponse.redirect(maal);
  }

  if (code) {
    const klient = await supabaseSession();
    const { error } = await klient.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Kunne ikke indløse kode fra invitationslink:", error.message);
      return tilFejl(req, "Linket er udløbet eller allerede brugt. Bed om en ny invitation.");
    }

    return videreTil(req, rensVidere(sp.get("next")));
  }

  return tilFejl(req, "Linket manglede oplysninger. Bed om en ny invitation.");
}

export async function POST(req: NextRequest) {
  const formular = await req.formData();
  const tokenHash = formular.get("token_hash");
  const type = formular.get("type");

  if (typeof tokenHash !== "string" || tokenHash === "" || !erType(type)) {
    return tilFejl(req, "Linket manglede oplysninger. Bed om en ny invitation.");
  }

  const klient = await supabaseSession();
  const { error } = await klient.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    console.error("Kunne ikke bekræfte invitationslink:", error.message);
    return tilFejl(req, "Linket er udløbet eller allerede brugt. Bed om en ny invitation.");
  }

  return videreTil(req, rensVidere(formular.get("next")));
}
