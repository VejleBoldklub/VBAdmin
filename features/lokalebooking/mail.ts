import { headers } from "next/headers";
import { sendViaResend } from "./mail-resend";
import { sendViaSmtp } from "./mail-smtp";

// Afsendelse af mails.
//
// Modulet er transport og intet andet: hvad der står i mailene, ligger i
// mail-tekster.ts. Det er delt op, fordi teksterne ændres jævnligt, mens
// afsendelsen ikke gør.
//
// Selve forbindelsen ud af huset ligger i to filer, én pr. leverandør:
// mail-smtp.ts (One.com) og mail-resend.ts. Denne fil vælger mellem dem og er
// det eneste, resten af modulet kender. Opdelingen er der, fordi skiftet fra
// Resend til SMTP endnu ikke er afprøvet i produktion — se MAIL_TRANSPORT
// nedenfor.
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

// Afsenderen er den samme, uanset hvem der transporterer mailen. MAIL_FROM er
// det leverandøruafhængige navn; RESEND_FROM_EMAIL læses fortsat, så en
// eksisterende opsætning ikke skifter afsender, blot fordi transporten skiftede.
function afsender(): string {
  return process.env.MAIL_FROM || process.env.RESEND_FROM_EMAIL || STANDARD_AFSENDER;
}

export async function sendMail(mail: Mail): Promise<MailResultat> {
  const fra = afsender();

  // SMTP er standarden. "resend" er vejen tilbage, og den skal kunne tages uden
  // en kodeændring: virker One.com ikke som forventet i produktion, er det én
  // miljøvariabel i Vercel og et redeploy, ikke en pull request.
  if (process.env.MAIL_TRANSPORT?.trim().toLowerCase() === "resend") {
    return sendViaResend(mail, fra);
  }

  return sendViaSmtp(mail, fra);
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
