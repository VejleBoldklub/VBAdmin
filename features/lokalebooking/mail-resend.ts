import { Resend } from "resend";
import type { Mail, MailResultat } from "./mail";

// Afsendelse gennem Resend.
//
// Dette var modulets eneste transport frem til skiftet til SMTP hos One.com.
// Koden er bevaret uændret, så vi kan skifte tilbage uden en kodeændring, hvis
// SMTP ikke holder i produktion: sæt MAIL_TRANSPORT=resend i Vercel. Se mail.ts.
//
// Når SMTP har vist sig at virke, kan denne fil, resend-afhængigheden og
// MAIL_TRANSPORT fjernes i én omgang.

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

export async function sendViaResend(mail: Mail, afsender: string): Promise<MailResultat> {
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
