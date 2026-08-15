import { headers } from "next/headers";

// Sidens egen adresse, absolut.
//
// Lå tidligere i features/lokalebooking/mail.ts. Den bruges nu også af
// invitationsmailen fra Administration og af kiosklinket på infoskærmens
// adminside, og hører derfor til i lib/ frem for i ét moduls mail-lag.
//
// APP_BASE_URL vinder, når den er sat. Ellers bruges værtsnavnet fra den
// forespørgsel, kaldet udspringer af — det giver af sig selv de rigtige links
// både i produktion og i et preview-deployment, hvor et fast domæne ville pege
// det forkerte sted hen.
export async function appBaseUrl(): Promise<string> {
  const eksplicit = process.env.APP_BASE_URL;
  if (eksplicit) return eksplicit.replace(/\/+$/, "");

  const h = await headers();
  const vaert = h.get("x-forwarded-host") ?? h.get("host");

  if (vaert) {
    const protokol = h.get("x-forwarded-proto") ?? (vaert.startsWith("localhost") ? "http" : "https");
    return `${protokol}://${vaert}`;
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  throw new Error("Kunne ikke bestemme sidens adresse. Sæt APP_BASE_URL.");
}

// Adressen på produktionssiden, uanset hvor koden kører.
//
// Til brug hvor linket skal ud af huset og blive stående — kiosk-pc'ens URL er
// det oplagte eksempel. appBaseUrl ville dér give preview-deploymentets adresse,
// og den holder op med at virke, når previewet forsvinder.
export async function produktionsBaseUrl(): Promise<string> {
  const eksplicit = process.env.APP_BASE_URL;
  if (eksplicit) return eksplicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return appBaseUrl();
}
