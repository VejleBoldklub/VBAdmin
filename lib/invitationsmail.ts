// Invitationsmailen fra Administration, når den sendes af os selv.
//
// Normalt sender Supabase Auth invitationen. Fejler Supabase' egen afsendelse,
// sender adminfladen den i stedet gennem samme SMTP-forbindelse som
// lokalebookingen — se inviterBruger i app/admin/administration/actions.ts.

function esc(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function invitationsmail(navn: string | null, link: string) {
  const hilsen = navn ? `Hej ${navn}` : "Hej";
  const tekst =
    "Du er blevet inviteret til Vejle Boldklub Admin. Klik på knappen for at vælge din adgangskode. Linket virker kun én gang.";

  return {
    emne: "Du er inviteret til Vejle Boldklub Admin",
    html: `<!doctype html>
<html lang="da">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.15em;text-transform:uppercase;color:#b91c1c;">Vejle Boldklub Admin</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">${esc(hilsen)}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#0f172a;">${esc(tekst)}</p>
    <p style="margin:0 0 20px;"><a href="${esc(link)}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:8px;">Vælg adgangskode</a></p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#475569;">Virker knappen ikke, så kopiér denne adresse ind i browseren:<br>${esc(link)}</p>
  </div>
</body>
</html>`,
    tekst: [hilsen, "", tekst, "", link, "", "Vejle Boldklub Admin"].join("\n"),
  };
}
