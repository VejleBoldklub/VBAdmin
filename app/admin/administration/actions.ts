"use server";

import { revalidatePath } from "next/cache";
import { appBaseUrl } from "@/lib/base-url";
import { kraevAdministrator, MODULER, type Modul } from "@/lib/adgang";
import { antalAdministratorer } from "@/lib/administration";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { beskrivSupabaseFejl } from "@/lib/infoskaerm/data";
import type { GemResultat } from "@/lib/infoskaerm/types";
import { sendMail } from "@/features/lokalebooking/mail";
import { invitationsmail } from "@/lib/invitationsmail";

// Brugerstyring: invitér, ret og fjern.
//
// Hver handling kontrollerer selv, at kaldet kommer fra en administrator.
// Begrundelsen er den samme som for de øvrige moduler — se lib/adgang.ts — og
// vejer tungest her: det er handlingerne i denne fil, der uddeler adgang.

const STI = "/admin/administration";

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";

// Bevidst løs. En streng validering af mailadresser afviser gyldige adresser
// oftere end den fanger tastefejl, og adressen bekræftes alligevel af, om
// invitationen når frem.
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function renseModuler(vaerdier: unknown): Modul[] {
  if (!Array.isArray(vaerdier)) return [];

  return MODULER.filter((m) => vaerdier.includes(m));
}

function tjekRolle(vaerdi: unknown): "admin" | "user" | null {
  return vaerdi === "admin" || vaerdi === "user" ? vaerdi : null;
}

// Navnet er valgfrit. Et blankt felt bliver til null, ikke til en tom streng —
// databasen afviser tomme strenge, og null er det, der betyder "intet navn"
// hele vejen op gennem visningen.
const NAVN_MAKS = 80;

function renseNavn(vaerdi: unknown): string | null | { fejl: string } {
  if (typeof vaerdi !== "string") return null;

  const rent = vaerdi.trim();

  if (rent === "") return null;
  if (rent.length > NAVN_MAKS) return { fejl: `Navnet må højst være ${NAVN_MAKS} tegn.` };

  return rent;
}

function erNavnefejl(v: string | null | { fejl: string }): v is { fejl: string } {
  return typeof v === "object" && v !== null;
}

export async function inviterBruger(
  email: string,
  navn: string,
  rolle: string,
  moduler: string[]
): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at invitere en bruger uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  const rentNavn = renseNavn(navn);
  if (erNavnefejl(rentNavn)) return { ok: false, fejl: rentNavn.fejl };

  const adresse = email.trim().toLowerCase();

  if (!MAIL.test(adresse)) {
    return { ok: false, fejl: "Skriv en gyldig e-mailadresse." };
  }

  const renRolle = tjekRolle(rolle);
  if (!renRolle) return { ok: false, fejl: "Ukendt rolle." };

  const renModuler = renseModuler(moduler);

  if (renRolle === "user" && renModuler.length === 0) {
    return {
      ok: false,
      fejl: "Vælg mindst ét modul. En bruger uden moduler kan logge ind, men ikke åbne noget.",
    };
  }

  // Invitationen sendes af Supabase Auth. Der bygges bevidst ikke et eget
  // tokenflow: det findes allerede her, og et hjemmelavet ville skulle løse
  // udløb, engangsbrug og genafsendelse forfra. Kun selve mailen har en
  // reservevej — se inviterSelv nedenfor.
  const base = await appBaseUrl();

  const redirectTo = `${base}/auth/bekraeft?next=/opret-adgangskode`;

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(adresse, {
    redirectTo,
  });

  let bruger: { id: string } | null = data?.user ?? null;
  let advarsel: string | null = null;

  if (error || !bruger) {
    console.error("Kunne ikke invitere", adresse, "-", error?.code, error?.message);

    // Findes adressen allerede, er beskeden fra Supabase brugbar og vises,
    // som den er — siden er bag login.
    if (error?.code === "email_exists" || /already been registered/i.test(error?.message ?? "")) {
      return { ok: false, fejl: error?.message ?? "Adressen findes allerede." };
    }

    // Ellers er det typisk Supabase' egen mailafsendelse, der fejler ("Error
    // sending invite email") — dens SMTP-opsætning, eller dens grænse for
    // antal mails. Så sendes invitationen af os selv i stedet: Supabase laver
    // stadig brugeren og engangslinket, men mailen går gennem samme
    // SMTP-forbindelse som lokalebookingen.
    const reserve = await inviterSelv(adresse, rentNavn, redirectTo, base);
    if (!reserve.ok) return reserve;

    bruger = reserve.bruger;
    advarsel = reserve.advarsel;
  }

  if (!bruger) return { ok: false, fejl: "Invitationen kunne ikke sendes." };

  const { error: raekkefejl } = await supabaseAdmin.from("admin_users").upsert(
    {
      auth_user_id: bruger.id,
      email: adresse,
      navn: rentNavn,
      rolle: renRolle,
      allowed_modules: renRolle === "admin" ? [] : renModuler,
    },
    { onConflict: "auth_user_id" }
  );

  if (raekkefejl) {
    // Brugeren er oprettet i Auth, men har ingen adgang. Det skal siges tydeligt
    // — ellers står der en invitation, der fører til "ingen adgang".
    console.error("Bruger inviteret, men adgangen kunne ikke gemmes:", raekkefejl);
    return {
      ok: false,
      fejl: `Invitationen blev sendt, men adgangen kunne ikke gemmes: ${beskrivSupabaseFejl(raekkefejl)}`,
    };
  }

  revalidatePath(STI);

  // Brugeren er oprettet og har adgang, men mailen kom ikke af sted. Linket
  // vises til administratoren, så det kan sendes på anden vis.
  if (advarsel) return { ok: false, fejl: advarsel };

  return { ok: true };
}

// Invitationen uden Supabase' mailafsendelse.
//
// generateLink opretter brugeren og engangstokenet præcis som en almindelig
// invitation, men sender ingenting. Linket bygges, så det lander på
// /auth/bekraeft med token_hash, ligesom Supabase' egen skabelon er sat op til.
async function inviterSelv(
  adresse: string,
  navn: string | null,
  redirectTo: string,
  base: string
): Promise<
  | { ok: true; bruger: { id: string }; advarsel: string | null }
  | { ok: false; fejl: string }
> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: adresse,
    options: { redirectTo },
  });

  const hash = data?.properties?.hashed_token;

  if (error || !data?.user || !hash) {
    console.error("Kunne ikke lave invitationslink til", adresse, "-", error?.message);
    return { ok: false, fejl: error?.message ?? "Invitationen kunne ikke oprettes." };
  }

  const sendt = await sendLink(adresse, navn, base, hash, "invite", "/opret-adgangskode");

  if (!sendt.ok) {
    return {
      ok: true,
      bruger: data.user,
      advarsel:
        `Brugeren er oprettet med adgang, men mailen kunne ikke sendes (${sendt.grund}). ` +
        `Send dette link til brugeren selv — det virker kun én gang: ${sendt.link}`,
    };
  }

  return { ok: true, bruger: data.user, advarsel: null };
}

// Bygger linket til /auth/bekraeft og sender det med vores egen SMTP.
async function sendLink(
  adresse: string,
  navn: string | null,
  base: string,
  hash: string,
  type: "invite" | "recovery",
  videre: string
): Promise<{ ok: true } | { ok: false; grund: string; link: string }> {
  const link =
    `${base}/auth/bekraeft?token_hash=${encodeURIComponent(hash)}` +
    `&type=${type}&next=${encodeURIComponent(videre)}`;

  const indhold = invitationsmail(navn, link);
  const sendt = await sendMail({
    til: adresse,
    emne: indhold.emne,
    html: indhold.html,
    tekst: indhold.tekst,
    fraNavn: "Vejle Boldklub Admin",
  });

  if (!sendt.ok) {
    console.error("Invitationsmail kunne ikke sendes til", adresse, "-", sendt.grund);
    return { ok: false, grund: sendt.grund, link };
  }

  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// En ny invitation til en bruger, der ikke nåede at bruge den første.
//
// Linket i en invitation virker kun én gang og kun i begrænset tid. Er det
// udløbet, laves et nyt engangslink til samme bruger — adgangen i admin_users
// røres ikke. Har brugeren aldrig bekræftet sin adresse, er det en ny
// invitation; ellers et nulstillingslink, der fører til samme side, hvor der
// vælges adgangskode.
export async function sendNyInvitation(authUserId: string): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at sende en ny invitation uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (!UUID.test(authUserId)) return { ok: false, fejl: "Ukendt bruger." };

  const { data: raekke, error: raekkefejl } = await supabaseAdmin
    .from("admin_users")
    .select("email, navn")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (raekkefejl) {
    console.error("Kunne ikke læse bruger til ny invitation:", raekkefejl);
    return { ok: false, fejl: `Kunne ikke hente brugeren: ${beskrivSupabaseFejl(raekkefejl)}` };
  }

  if (!raekke || typeof raekke.email !== "string") {
    return { ok: false, fejl: "Brugeren findes ikke længere. Genindlæs siden." };
  }

  const adresse = raekke.email;
  const navn = typeof raekke.navn === "string" ? raekke.navn : null;

  const { data: auth } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const bekraeftet = Boolean(auth?.user?.email_confirmed_at);

  const base = await appBaseUrl();

  // Først en invitation, hvis adressen ikke er bekræftet. Afviser Supabase den,
  // bruges et nulstillingslink — det virker for enhver eksisterende bruger.
  const forsoeg: { type: "invite" | "recovery"; videre: string }[] = bekraeftet
    ? [{ type: "recovery", videre: "/opret-adgangskode?nulstil=1" }]
    : [
        { type: "invite", videre: "/opret-adgangskode" },
        { type: "recovery", videre: "/opret-adgangskode?nulstil=1" },
      ];

  let sidsteFejl = "Linket kunne ikke laves.";

  for (const { type, videre } of forsoeg) {
    const redirectTo = `${base}/auth/bekraeft?next=${encodeURIComponent(videre)}`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type,
      email: adresse,
      options: { redirectTo },
    });

    const hash = data?.properties?.hashed_token;

    if (error || !hash) {
      console.error("Kunne ikke lave", type, "-link til", adresse, "-", error?.message);
      sidsteFejl = error?.message ?? sidsteFejl;
      continue;
    }

    const sendt = await sendLink(adresse, navn, base, hash, type, videre);

    if (!sendt.ok) {
      return {
        ok: false,
        fejl:
          `Mailen kunne ikke sendes (${sendt.grund}). ` +
          `Send dette link til brugeren selv — det virker kun én gang: ${sendt.link}`,
      };
    }

    return { ok: true };
  }

  return { ok: false, fejl: `Invitationen kunne ikke sendes: ${sidsteFejl}` };
}

export async function opdaterBruger(
  authUserId: string,
  navn: string,
  rolle: string,
  moduler: string[]
): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at ændre en bruger uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  const rentNavn = renseNavn(navn);
  if (erNavnefejl(rentNavn)) return { ok: false, fejl: rentNavn.fejl };

  const renRolle = tjekRolle(rolle);
  if (!renRolle) return { ok: false, fejl: "Ukendt rolle." };

  const renModuler = renseModuler(moduler);

  if (renRolle === "user" && renModuler.length === 0) {
    return { ok: false, fejl: "Vælg mindst ét modul, eller gør brugeren til administrator." };
  }

  // Den sidste administrator må ikke fjerne sin egen rolle. Vejen tilbage ville
  // gå gennem SQL-editoren i Supabase, og det er ikke et sted, klubben skal
  // hen for at komme ind i sit eget adminværktøj.
  if (
    authUserId === kalder.authUserId &&
    renRolle !== "admin" &&
    (await antalAdministratorer()) <= 1
  ) {
    return {
      ok: false,
      fejl: "Du er den sidste administrator. Gør en anden til administrator først.",
    };
  }

  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({
      navn: rentNavn,
      rolle: renRolle,
      allowed_modules: renRolle === "admin" ? [] : renModuler,
    })
    .eq("auth_user_id", authUserId);

  if (error) {
    console.error("Kunne ikke opdatere bruger:", error);
    return { ok: false, fejl: `Kunne ikke gemme: ${beskrivSupabaseFejl(error)}` };
  }

  revalidatePath(STI);
  return { ok: true };
}

export async function fjernBruger(authUserId: string): Promise<GemResultat> {
  const kalder = await kraevAdministrator();
  if (!kalder) {
    console.error("Afvist forsøg på at fjerne en bruger uden administratoradgang.");
    return { ok: false, fejl: IKKE_ADMIN };
  }

  if (authUserId === kalder.authUserId) {
    return { ok: false, fejl: "Du kan ikke fjerne dig selv." };
  }

  // Rækken slettes først. Går det andet trin galt, er adgangen alligevel væk —
  // det er den rækkefølge, der fejler mest skånsomt.
  const { error } = await supabaseAdmin
    .from("admin_users")
    .delete()
    .eq("auth_user_id", authUserId);

  if (error) {
    console.error("Kunne ikke fjerne bruger:", error);
    return { ok: false, fejl: `Kunne ikke fjerne: ${beskrivSupabaseFejl(error)}` };
  }

  // Auth-brugeren slettes med. Bliver den stående, kan adressen ikke inviteres
  // igen — Supabase svarer, at brugeren allerede findes.
  const { error: authfejl } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

  if (authfejl) {
    console.error("Adgang fjernet, men auth-brugeren kunne ikke slettes:", authfejl.message);
    revalidatePath(STI);

    return {
      ok: false,
      fejl: `Adgangen er fjernet, men brugeren findes stadig i Supabase Auth: ${authfejl.message}`,
    };
  }

  revalidatePath(STI);
  return { ok: true };
}
