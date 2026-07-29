import { NextResponse, type NextRequest } from "next/server";

// Adgangskontrol til adminfladen.
//
// Uden dette er /admin offentligt tilgængeligt. Alle skrivninger derfra går
// gennem service_role-nøglen, så enhver med adressen kunne redigere, publicere
// eller kassere baneplaner.
//
// Dette er en mellemløsning, ikke rigtige brugerlogins. Brugere, roller og
// rettigheder ligger i Fase 5 i SYSTEM.md §18. Formålet her er alene at lukke en
// åben dør, indtil den rigtige adgangsstyring findes.
//
// Kun /admin beskyttes. De offentlige baneplanruter skal blive ved at være
// tilgængelige, fordi de vises i en iframe i klubbens CMS. Derfor kan Vercels
// egen adgangsbeskyttelse ikke bruges: den dækker hele deploymentet og ville også
// lukke /baneplan.
//
// Filen heder proxy.ts, ikke middleware.ts. Sidstnævnte konvention er deprecated
// fra Next 16 og advarer under build.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

const REALM = 'Basic realm="VBAdmin", charset="UTF-8"';

// Sammenligner uden at afslutte tidligt ved første afvigende tegn, så svartiden
// ikke afslører hvor langt et gæt kom. Længden lækkes stadig, hvilket er
// acceptabelt her.
function ensKonstantTid(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let forskel = 0;
  for (let i = 0; i < a.length; i++) {
    forskel |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return forskel === 0;
}

function kraevLogin() {
  return new NextResponse("Adgang kræver login.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export function proxy(req: NextRequest) {
  const forventet = process.env.ADMIN_BASIC_AUTH;

  // Fejl lukket, ikke åbent. Er variablen ikke sat, er adminfladen utilgængelig
  // frem for ubeskyttet. En glemt miljøvariabel må ikke kunne åbne døren igen.
  if (!forventet) {
    return new NextResponse(
      "Adminfladen er ikke konfigureret. ADMIN_BASIC_AUTH mangler i miljøvariablerne.",
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return kraevLogin();
  }

  let oplysninger: string;
  try {
    oplysninger = atob(header.slice(6));
  } catch {
    // Ugyldig base64 behandles som et forkert forsøg, ikke som en serverfejl.
    return kraevLogin();
  }

  if (!ensKonstantTid(oplysninger, forventet)) {
    return kraevLogin();
  }

  return NextResponse.next();
}
