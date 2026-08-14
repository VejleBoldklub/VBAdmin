import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

// Kontrol af, at kaldet kommer fra en indlogget administrator.
//
// Hvorfor det ikke er nok at proxy.ts beskytter /admin: en server action er et
// POST-endepunkt, der findes i hele serverbundtet. Next slår handlingen op på
// dens id, ikke på hvilken sti den kaldes fra, så et kald til en offentlig rute —
// /lokalebooking/cafeteria, som IKKE er bag login — kan udpege en handling, der
// hører til adminfladen. Handlingens id ligger i et klientbundt under
// /_next/static, som heller ikke er bag login.
//
// Next sammenligner ganske vist Origin og Host og stopper dermed et angreb, hvor
// en anden hjemmeside får browseren til at sende kaldet. Det stopper ikke et
// kald, der bare sætter de to headere selv.
//
// Derfor kontrollerer hver handling sin egen adgang. Det virker for den rigtige
// administrator, fordi browseren sender Basic-oplysningerne med på POST'et til
// /admin-siden, handlingen kaldes fra.

function ensKonstantTid(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");

  // timingSafeEqual kaster ved forskellig længde, så den skal tjekkes først.
  // Længden lækkes dermed, hvilket er acceptabelt — det er samme afvejning som i
  // proxy.ts.
  if (x.length !== y.length) return false;

  return timingSafeEqual(x, y);
}

export async function erAdmin(): Promise<boolean> {
  const forventet = process.env.ADMIN_BASIC_AUTH;

  // Fejler lukket, som proxy.ts. Er variablen ikke sat, er adminfladen
  // utilgængelig frem for ubeskyttet.
  if (!forventet) return false;

  const header = (await headers()).get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  let oplysninger: string;
  try {
    oplysninger = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }

  return ensKonstantTid(oplysninger, forventet);
}
