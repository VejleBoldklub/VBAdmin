import { headers } from "next/headers";
import { Resend } from "resend";

// Afsendelse af mails gennem Resend.
//
// Modulet er transport og intet andet: hvad der står i mailene, ligger i
// mail-tekster.ts. Det er delt op, fordi teksterne ændres jævnligt, mens
// afsendelsen ikke gør.
//
// Ingen afsendelse må kunne vælte det, den handler om. Funktionerne her kaster
// derfor ikke — de returnerer et resultat og logger årsagen. En booking, der
// blev oprettet korrekt, skal stå, selv om kvitteringen ikke kunne sendes.

const STANDARD_AFSENDER = "Lokalebooking VB Parken <booking@vejleboldklub.dk>";

export type MailResultat = { ok: true; id: string | null } | { ok: false; grund: string };

export type Mail = {
  til: string;
  emne: string;
  html: string;
  tekst: string;
  // Sættes til den lokaleansvarlige, hvor der findes en. Uden den ville et svar
  // fra bookeren lande i afsenderpostkassen, som ingen læser.
  svarTil?: string | null;
};

// Klienten oprettes først ved brug. Oprettes den på modulniveau, fejler
// `next build` på en maskine uden nøglen, fordi Next importerer modulet under
// indsamling af sidedata — samme fælde som lib/supabase-public.ts beskriver.
let klient: Resend | null = null;

function resend(): Resend | null {
  if (klient) return klient;

  const noegle = process.env.RESEND_API_KEY;
  if (!noegle) return null;

  klient = new Resend(noegle);
  return klient;
}

export async function sendMail(mail: Mail): Promise<MailResultat> {
  const afsender = process.env.RESEND_FROM_EMAIL || STANDARD_AFSENDER;
  const klient = resend();

  if (!klient) {
    // Ikke en undtagelse: uden nøgle skal alt andet stadig virke. I udvikling er
    // det den normale tilstand.
    console.error(`Mangler RESEND_API_KEY. Mail til ${mail.til} blev ikke sendt: ${mail.emne}`);
    return { ok: false, grund: "Mangler RESEND_API_KEY" };
  }

  try {
    const { data, error } = await klient.emails.send({
      from: afsender,
      to: [mail.til],
      subject: mail.emne,
      html: mail.html,
      text: mail.tekst,
      ...(mail.svarTil ? { replyTo: mail.svarTil } : {}),
    });

    if (error) {
      console.error(`Resend afviste mail til ${mail.til} (${mail.emne}): ${error.message}`);
      return { ok: false, grund: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (e) {
    const grund = e instanceof Error ? e.message : String(e);
    console.error(`Kunne ikke sende mail til ${mail.til} (${mail.emne}): ${grund}`);
    return { ok: false, grund };
  }
}

// Absolut adresse til links i mails. Et relativt link er ubrugeligt i en mail.
//
// APP_BASE_URL vinder, når den er sat. Ellers bruges værtsnavnet fra den
// forespørgsel, mailen udspringer af — det giver af sig selv de rigtige links
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
