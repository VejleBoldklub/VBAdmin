// Indholdet i de mails, modulet sender.
//
// Adskilt fra afsendelsen i mail.ts, fordi teksterne bliver rettet jævnligt og
// afsendelsen ikke gør.
//
// Hver mail bygges i både HTML og ren tekst. Tekstudgaven er ikke pynt: den
// bruges af mailklienter, der ikke viser HTML, og den tæller med, når
// spamfiltre vurderer en mail.

export type MailBooking = {
  lokaleNavn: string;
  // Tidsrummet skrevet ud i dansk tid, fra tidsrumTekst().
  naar: string;
  formaal: string;
  hold: string | null;
  navn: string;
  email: string;
  mobil: string;
  besked: string | null;
};

export type MailIndhold = { emne: string; html: string; tekst: string };

const ROED = "#b91c1c";
const MOERK = "#0f172a";
const GRAA = "#475569";

// Alt, brugeren selv har skrevet, skal gennem denne, før det havner i HTML.
// React escaper for os i brugerfladen; her bygger vi strengene selv, og en
// booking med et formål som "<script>" ville ellers blive til markup i
// modtagerens indbakke.
function esc(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Raekke = { navn: string; vaerdi: string };

function raekkerFor(b: MailBooking): Raekke[] {
  const raekker: Raekke[] = [
    { navn: "Lokale", vaerdi: b.lokaleNavn },
    { navn: "Tidspunkt", vaerdi: b.naar },
    { navn: "Formål", vaerdi: b.formaal },
  ];

  if (b.hold) raekker.push({ navn: "Hold", vaerdi: b.hold });
  if (b.besked) raekker.push({ navn: "Besked", vaerdi: b.besked });

  return raekker;
}

// Samme oversigt uden "Tidspunkt". Bruges af serie-mailene, hvor tiderne ikke er
// én værdi, men en liste, og hvor en enkelt "Tidspunkt"-linje derfor ville vise et
// af tidsrummene og fortie resten.
function raekkerUdenTid(b: MailBooking): Raekke[] {
  return raekkerFor(b).filter((r) => r.navn !== "Tidspunkt");
}

function htmlRaekker(raekker: Raekke[]): string {
  return raekker
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 16px 6px 0;color:${GRAA};font-size:14px;vertical-align:top;white-space:nowrap;">${esc(r.navn)}</td>
        <td style="padding:6px 0;color:${MOERK};font-size:14px;vertical-align:top;">${esc(r.vaerdi)}</td>
      </tr>`
    )
    .join("");
}

function tekstRaekker(raekker: Raekke[]): string {
  return raekker.map((r) => `${r.navn}: ${r.vaerdi}`).join("\n");
}

// `kanSvares` fortæller, om mailen har en Reply-To, der peger på et menneske.
// Uden den ville fodnoten love, at man kan svare, og svaret ville lande i
// afsenderpostkassen, som ingen læser. Et løfte, der ikke holder, er værre end
// ingen.
function layout(overskrift: string, brood: string, kanSvares: boolean): string {
  const fod = kanSvares
    ? "Denne mail er sendt automatisk fra VB Parkens lokalebooking. Du kan svare på den, hvis du har spørgsmål."
    : "Denne mail er sendt automatisk fra VB Parkens lokalebooking. Har du spørgsmål, er du velkommen til at kontakte klubben.";

  return layoutMed(overskrift, brood, fod);
}

function layoutMed(overskrift: string, brood: string, fod: string): string {
  return `<!doctype html>
<html lang="da">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:.18em;text-transform:uppercase;color:${ROED};">Vejle Boldklub</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${MOERK};">${esc(overskrift)}</h1>
    ${brood}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:${GRAA};">
      ${esc(fod)}
    </p>
  </div>
</body>
</html>`;
}

function afsnit(tekst: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${MOERK};">${esc(tekst)}</p>`;
}

function tabel(raekker: Raekke[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">${htmlRaekker(raekker)}</table>`;
}

// 1) Kvittering til den, der har booket.
export function bekraeftelseTilBooker(
  b: MailBooking,
  kraeverGodkendelse: boolean,
  kanSvares: boolean
): MailIndhold {
  const raekker = raekkerFor(b);

  const overskrift = kraeverGodkendelse
    ? "Vi har modtaget din booking"
    : "Din booking er bekræftet";

  const forklaring = kraeverGodkendelse
    ? "Tidsrummet er reserveret, indtil bookingen er behandlet. Du får en mail, så snart den er godkendt eller afvist."
    : "Tidsrummet er reserveret. Du behøver ikke gøre mere.";

  return {
    emne: kraeverGodkendelse
      ? `Modtaget: din booking af ${b.lokaleNavn}`
      : `Bekræftet: din booking af ${b.lokaleNavn}`,
    html: layout(
      overskrift,
      afsnit(`Hej ${b.navn}`) + tabel(raekker) + afsnit(forklaring),
      kanSvares
    ),
    tekst: [
      `Hej ${b.navn}`,
      "",
      overskrift,
      "",
      tekstRaekker(raekker),
      "",
      forklaring,
      "",
      "Vejle Boldklub — VB Parkens lokalebooking",
    ].join("\n"),
  };
}

// 2) Notifikation til den lokaleansvarlige, med de to links.
export function notifikationTilAnsvarlig(
  b: MailBooking,
  godkendLink: string,
  afvisLink: string
): MailIndhold {
  const raekker = [
    ...raekkerFor(b),
    { navn: "Booket af", vaerdi: b.navn },
    { navn: "E-mail", vaerdi: b.email },
    { navn: "Mobil", vaerdi: b.mobil },
  ];

  const knap = (tekst: string, adresse: string, baggrund: string, kant: string, farve: string) =>
    `<a href="${esc(adresse)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:8px;background:${baggrund};border:1px solid ${kant};color:${farve};font-size:14px;font-weight:bold;text-decoration:none;">${esc(tekst)}</a>`;

  return {
    emne: `Cafeteria-booking afventer godkendelse — ${b.naar}`,
    html: layoutMed(
      "En cafeteria-booking venter på svar",
      tabel(raekker) +
        `<div style="margin:20px 0 4px;">${knap("Godkend booking", godkendLink, ROED, ROED, "#ffffff")}${knap("Afvis booking", afvisLink, "#ffffff", "#cbd5e1", MOERK)}</div>` +
        `<p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:${GRAA};">Begge links åbner en side, hvor du bekræfter valget — der sker ingenting, før du trykker på knappen dér. Ved afvisning kan du skrive en kort begrundelse, som bookeren får at vide.</p>`,
      // Svar på denne mail går til bookeren, så et spørgsmål kan stilles direkte,
      // før der tages stilling.
      "Denne mail er sendt automatisk fra VB Parkens lokalebooking. Svarer du på den, går svaret til den, der har booket."
    ),
    tekst: [
      "En cafeteria-booking venter på svar.",
      "",
      tekstRaekker(raekker),
      "",
      `Godkend: ${godkendLink}`,
      `Afvis:   ${afvisLink}`,
      "",
      "Begge links åbner en side, hvor du bekræfter valget. Der sker ingenting, før du trykker på knappen dér.",
    ].join("\n"),
  };
}

// 4) Besked til bookeren, når klubben annullerer en booking, der allerede var
//    på plads.
//
// Egen mail frem for en variant af afslaget. De to ligner hinanden, men er ikke
// det samme: et afslag er svaret på en forespørgsel, en annullering rammer noget,
// bookeren troede var i orden — måske en aftale, andre allerede er indkaldt til.
// Det skal stå tydeligt, og tonen skal være en anden.
export function aflysningTilBooker(b: MailBooking, kanSvares: boolean): MailIndhold {
  const raekker = raekkerFor(b);

  const overskrift = "Din booking er annulleret";
  const forklaring =
    "Klubben har annulleret bookingen, og tidsrummet er givet fri igen. Har du brug for lokalet, er du velkommen til at booke en anden tid.";

  return {
    emne: `Annulleret: din booking af ${b.lokaleNavn}`,
    html: layout(
      overskrift,
      afsnit(`Hej ${b.navn}`) +
        tabel(raekker) +
        afsnit(forklaring) +
        (kanSvares ? afsnit("Har du spørgsmål til hvorfor, kan du svare på denne mail.") : ""),
      kanSvares
    ),
    tekst: [
      `Hej ${b.navn}`,
      "",
      overskrift,
      "",
      tekstRaekker(raekker),
      "",
      forklaring,
      "",
      "Vejle Boldklub — VB Parkens lokalebooking",
    ].join("\n"),
  };
}

// 3) Svar til bookeren, når nogen har taget stilling.
export function beslutningTilBooker(
  b: MailBooking,
  beslutning: "godkendt" | "afvist",
  grund: string | null,
  kanSvares: boolean
): MailIndhold {
  const raekker = raekkerFor(b);
  const godkendt = beslutning === "godkendt";

  const overskrift = godkendt ? "Din booking er godkendt" : "Din booking blev ikke godkendt";

  const forklaring = godkendt
    ? "Tidsrummet er nu bekræftet, og lokalet er dit."
    : "Tidsrummet er givet fri igen, så andre kan booke det.";

  const html =
    afsnit(`Hej ${b.navn}`) +
    tabel(raekker) +
    (!godkendt && grund
      ? `<p style="margin:0 0 12px;padding:12px 16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;font-size:14px;line-height:1.6;color:#7f1d1d;"><strong>Begrundelse:</strong> ${esc(grund)}</p>`
      : "") +
    afsnit(forklaring) +
    (!godkendt && kanSvares ? afsnit("Har du spørgsmål, kan du svare på denne mail.") : "");

  return {
    emne: godkendt
      ? `Godkendt: din booking af ${b.lokaleNavn}`
      : `Afvist: din booking af ${b.lokaleNavn}`,
    html: layout(overskrift, html, kanSvares),
    tekst: [
      `Hej ${b.navn}`,
      "",
      overskrift,
      "",
      tekstRaekker(raekker),
      ...(!godkendt && grund ? ["", `Begrundelse: ${grund}`] : []),
      "",
      forklaring,
      "",
      "Vejle Boldklub — VB Parkens lokalebooking",
    ].join("\n"),
  };
}

// 5) Kvittering til bookeren, når adminfladen har oprettet en hel serie.
//
// Én mail for hele serien, ikke én pr. dato. En fast ugentlig aftale hen over en
// sæson bliver til over tyve bookinger, og tyve ens mails i indbakken er ikke en
// service — de ville blive læst som en fejl og i værste fald få hele afsenderen
// markeret som spam.
//
// Datoerne står som en liste, fordi det er det, modtageren skal kunne tjekke:
// serien er allerede bekræftet, og det eneste, der er tilbage at gøre, er at se
// efter, om dagene passer.
function serieListe(tidspunkter: string[]): { html: string; tekst: string } {
  return {
    html: `<ul style="margin:16px 0;padding-left:20px;color:${MOERK};font-size:14px;line-height:1.7;">${tidspunkter
      .map((t) => `<li>${esc(t)}</li>`)
      .join("")}</ul>`,
    tekst: tidspunkter.map((t) => `- ${t}`).join("\n"),
  };
}

export function serieBekraeftelseTilBooker(
  b: MailBooking,
  tidspunkter: string[],
  moenster: string,
  kanSvares: boolean
): MailIndhold {
  const raekker = [...raekkerUdenTid(b), { navn: "Gentagelse", vaerdi: moenster }];
  const liste = serieListe(tidspunkter);

  const overskrift =
    tidspunkter.length === 1 ? "Din booking er bekræftet" : "Dine bookinger er bekræftet";

  const forklaring =
    "Tidsrummene er reserveret, og du behøver ikke gøre mere. Skal en af dagene aflyses, så kontakt klubben — hver dato kan aflyses for sig, uden at resten af rækken bliver rørt.";

  return {
    emne: `Bekræftet: ${tidspunkter.length} ${
      tidspunkter.length === 1 ? "booking" : "bookinger"
    } af ${b.lokaleNavn}`,
    html: layout(
      overskrift,
      afsnit(`Hej ${b.navn}`) +
        tabel(raekker) +
        afsnit("Bookingerne gælder disse dage:") +
        liste.html +
        afsnit(forklaring),
      kanSvares
    ),
    tekst: [
      `Hej ${b.navn}`,
      "",
      overskrift,
      "",
      tekstRaekker(raekker),
      "",
      "Bookingerne gælder disse dage:",
      liste.tekst,
      "",
      forklaring,
      "",
      "Vejle Boldklub — VB Parkens lokalebooking",
    ].join("\n"),
  };
}

// 6) Besked til bookeren, når klubben aflyser en hel serie på én gang.
//
// Også her én mail frem for én pr. dato, og af samme grund som ved oprettelsen.
// Tonen er aflysningens, ikke afslagets: bookeren troede, rækken var på plads.
export function serieAflysningTilBooker(
  b: MailBooking,
  tidspunkter: string[],
  kanSvares: boolean
): MailIndhold {
  const raekker = raekkerUdenTid(b);
  const liste = serieListe(tidspunkter);

  const overskrift =
    tidspunkter.length === 1 ? "Din booking er annulleret" : "Dine bookinger er annulleret";

  const forklaring =
    "Klubben har annulleret hele rækken, og tidsrummene er givet fri igen. Har du brug for lokalet, er du velkommen til at booke nye tider.";

  return {
    emne: `Annulleret: ${tidspunkter.length} ${
      tidspunkter.length === 1 ? "booking" : "bookinger"
    } af ${b.lokaleNavn}`,
    html: layout(
      overskrift,
      afsnit(`Hej ${b.navn}`) +
        tabel(raekker) +
        afsnit("Det gælder disse dage:") +
        liste.html +
        afsnit(forklaring) +
        (kanSvares ? afsnit("Har du spørgsmål til hvorfor, kan du svare på denne mail.") : ""),
      kanSvares
    ),
    tekst: [
      `Hej ${b.navn}`,
      "",
      overskrift,
      "",
      tekstRaekker(raekker),
      "",
      "Det gælder disse dage:",
      liste.tekst,
      "",
      forklaring,
      "",
      "Vejle Boldklub — VB Parkens lokalebooking",
    ].join("\n"),
  };
}
