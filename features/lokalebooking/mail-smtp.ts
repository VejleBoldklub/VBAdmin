import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Mail, MailResultat } from "./mail";

// Afsendelse gennem SMTP hos One.com.
//
// Filen ved intet om, hvad mails indeholder, eller hvem der skal have dem. Den
// åbner en forbindelse og afleverer. Valget mellem denne og mail-resend.ts
// træffes i mail.ts.

// Transporteren oprettes først ved brug. Oprettes den på modulniveau, fejler
// `next build` på en maskine uden opsætningen, fordi Next importerer modulet
// under indsamling af sidedata — samme fælde som lib/supabase-public.ts
// beskriver.
// Transporttypen skrives ud. Uden den er svaret fra sendMail utypet, og så
// bliver accepted og rejected nedenfor til any — netop de to felter, afgørelsen
// af om mailen kom af sted, hviler på.
type SmtpTransporter = Transporter<SMTPTransport.SentMessageInfo>;

let transporter: SmtpTransporter | null = null;

function smtp(): SmtpTransporter | { manglende: string[] } {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const manglende = [
    ["SMTP_HOST", host],
    ["SMTP_PORT", port],
    ["SMTP_USER", user],
    ["SMTP_PASS", pass],
  ]
    .filter(([, vaerdi]) => !vaerdi)
    .map(([navn]) => navn as string);

  if (manglende.length > 0) return { manglende };

  const portnummer = Number(port);
  if (!Number.isInteger(portnummer) || portnummer <= 0 || portnummer > 65535) {
    return { manglende: [`SMTP_PORT (ugyldig værdi: ${port})`] };
  }

  transporter = nodemailer.createTransport({
    host,
    port: portnummer,
    // 465 er SSL/TLS fra første byte. De øvrige porte, fx 587, starter i klartekst
    // og opgraderer med STARTTLS, og der skal secure være false. Det udledes af
    // porten frem for at være endnu en variabel, der kan sættes forkert.
    secure: portnummer === 465,
    auth: { user, pass },
    // Uden grænser venter nodemailer i minutter på en server, der ikke svarer.
    // Kvitteringen sendes, mens brugeren venter på svar på sin booking, så en
    // død forbindelse skal opgives hurtigt. Bookingen er gemt i forvejen;
    // mailen er det eneste, der går tabt.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

export async function sendViaSmtp(mail: Mail, afsender: string): Promise<MailResultat> {
  const forbindelse = smtp();

  if ("manglende" in forbindelse) {
    // Ikke en undtagelse: uden opsætning skal alt andet stadig virke. I udvikling
    // er det den normale tilstand.
    const grund = `Mangler ${forbindelse.manglende.join(", ")}`;
    console.error(`${grund}. Mail til ${mail.til} blev ikke sendt: ${mail.emne}`);
    return { ok: false, grund };
  }

  try {
    const info = await forbindelse.sendMail({
      from: afsender,
      to: mail.til,
      subject: mail.emne,
      html: mail.html,
      text: mail.tekst,
      ...(mail.svarTil ? { replyTo: mail.svarTil } : {}),
    });

    // En SMTP-server kan tage imod mailen til nogle modtagere og afvise den til
    // andre. Vi sender kun til én ad gangen, så en tom accepted-liste betyder,
    // at ingen fik den — det skal ikke tælle som en succes.
    if (info.accepted.length === 0) {
      // rejected rummer enten adresser som tekst eller som objekt, afhængigt af
      // hvordan modtageren blev angivet. Begge dele skal kunne læses i loggen.
      const afvist = info.rejected.map((r) => (typeof r === "string" ? r : r.address));
      const grund = `SMTP-serveren afviste modtageren${afvist.length > 0 ? `: ${afvist.join(", ")}` : ""}`;
      console.error(`${grund} (mail til ${mail.til}: ${mail.emne})`);
      return { ok: false, grund };
    }

    return { ok: true, id: info.messageId ?? null };
  } catch (e) {
    const grund = e instanceof Error ? e.message : String(e);
    console.error(`Kunne ikke sende mail til ${mail.til} (${mail.emne}): ${grund}`);
    return { ok: false, grund };
  }
}
