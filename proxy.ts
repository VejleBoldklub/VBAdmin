import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Adgangskontrol til adminfladen.
//
// Erstatter ADMIN_BASIC_AUTH, som var ét delt kodeord til hele adminfladen.
// Nu logger hver bruger ind med sin egen adresse gennem Supabase Auth, og
// adgangen afgøres pr. modul af rækken i admin_users.
//
// Hvad der beskyttes:
//   "/"                 forsiden, altså modulmenuen. Kun den eksakte sti —
//                       mønsteret er ikke et wildcard.
//   "/admin"            og alt derunder, med hver sit modulkrav
//
// Hvad der IKKE beskyttes, og bevidst ikke må blive det:
//   "/baneplan/*"           de offentlige baneplaner, vist i klubbens CMS
//   "/lokalebooking/*"      den offentlige booking
//   "/infoskaerm/cafeteria" kioskskærmen, som ingen kan logge ind på
//   "/godkend/*", "/afvis/*" mail-linkene til den lokaleansvarlige
//   "/login", "/auth/*"     ellers kunne ingen komme ind
//
// Dette lag er brugerfladen: det sender den, der ikke må, videre til /login
// eller /ingen-adgang. Det er ikke spærren. En server action slås op på sit id
// og kan rammes fra enhver rute i appen, så hver handling kontrollerer sin egen
// adgang med kraevAdgang() i lib/adgang.ts.
//
// Filen hedder proxy.ts, ikke middleware.ts. Sidstnævnte konvention er
// deprecated fra Next 16 og advarer under build.
export const config = {
  matcher: ["/", "/admin", "/admin/:path*"],
};

const MODUL_FOR_STI: { praefiks: string; modul: string }[] = [
  { praefiks: "/admin/baneplan", modul: "baneplan" },
  { praefiks: "/admin/lokalebooking", modul: "lokalebooking" },
  { praefiks: "/admin/infoskaerm", modul: "infoskaerm" },
];

function tilLogin(req: NextRequest) {
  const maal = req.nextUrl.clone();
  maal.pathname = "/login";

  // Hvor brugeren ville hen. Efter login sendes de videre dertil frem for til
  // forsiden, så et bogmærke til en bestemt side stadig virker.
  maal.search = `?videre=${encodeURIComponent(req.nextUrl.pathname)}`;

  return NextResponse.redirect(maal);
}

function tilIngenAdgang(req: NextRequest) {
  const maal = req.nextUrl.clone();
  maal.pathname = "/ingen-adgang";
  maal.search = "";

  return NextResponse.redirect(maal);
}

export async function proxy(req: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fejler lukket, ikke åbent. Manglende opsætning gør adminfladen
  // utilgængelig frem for ubeskyttet — en glemt miljøvariabel må ikke kunne
  // åbne døren. Det var også reglen, da adgangen var et delt kodeord.
  if (!url || !anonKey || !serviceKey) {
    return new NextResponse(
      "Adminfladen er ikke konfigureret. Supabase-miljøvariablerne mangler.",
      { status: 503 }
    );
  }

  let svar = NextResponse.next({ request: req });

  const klient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(nye) {
        // Sessionen fornys her. Det er derfor, den skal gennem proxy.ts og ikke
        // kan klares i en Server Component, som ikke må sætte cookies.
        for (const { name, value } of nye) {
          req.cookies.set(name, value);
        }

        svar = NextResponse.next({ request: req });

        for (const { name, value, options } of nye) {
          svar.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser, ikke getSession: cookien kommer fra browseren og får sin gyldighed
  // bekræftet hos Supabase frem for at blive troet på.
  const {
    data: { user },
  } = await klient.auth.getUser();

  if (!user) return tilLogin(req);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin
    .from("admin_users")
    .select("rolle, allowed_modules")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Kunne ikke slå adgang op i proxy:", error);
    return tilIngenAdgang(req);
  }

  // Et gyldigt login uden en række i admin_users er ikke en adgang. Brugeren kan
  // være oprettet i Supabase Auth uden at være givet adgang endnu, eller
  // adgangen kan være trukket tilbage.
  if (!data) return tilIngenAdgang(req);

  const erAdministrator = data.rolle === "admin";
  const sti = req.nextUrl.pathname;

  // Brugerstyringen følger rollen, ikke allowed_modules. Var den et modul,
  // kunne en bruger få adgang til at give sig selv adgang til resten.
  if (sti.startsWith("/admin/administration")) {
    return erAdministrator ? svar : tilIngenAdgang(req);
  }

  if (erAdministrator) return svar;

  const krav = MODUL_FOR_STI.find((m) => sti.startsWith(m.praefiks));

  // Forsiden og /admin i sig selv kræver kun, at man er logget ind med en
  // gyldig række. Forsiden viser derefter kun de moduler, brugeren må åbne.
  if (!krav) return svar;

  const moduler = Array.isArray(data.allowed_modules) ? data.allowed_modules : [];

  return moduler.includes(krav.modul) ? svar : tilIngenAdgang(req);
}
