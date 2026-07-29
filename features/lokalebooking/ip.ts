import { createHash } from "node:crypto";
import { headers } from "next/headers";

// Saltet hash af den besøgendes IP-adresse, til forsøgstælling.
//
// Adressen selv forlader aldrig denne fil, og der gemmes intet andet om den
// besøgende. Formålet er spam-forsvar, ikke sporing, og rækkerne i
// booking_forsoeg ryddes efter et døgn af databasefunktionen.
//
// Saltet er nødvendigt, ikke pynt: mængden af IPv4-adresser er så lille, at en
// usaltet hash kan opregnes bagfra på kort tid, og databasen ville derfor reelt
// indeholde adresserne.

export class ManglerSalt extends Error {
  constructor() {
    super("Mangler BOOKING_IP_SALT i miljøvariabler.");
    this.name = "ManglerSalt";
  }
}

export async function ipHash(): Promise<string> {
  const salt = process.env.BOOKING_IP_SALT;

  // Fejler lukket. Uden salt kunne modulet godt tage imod bookinger, men så ville
  // enten forsøgstællingen være slået fra eller hashen kunne opregnes. Samme valg
  // som ADMIN_BASIC_AUTH: en glemt miljøvariabel må ikke tavst svække noget.
  if (!salt) {
    throw new ManglerSalt();
  }

  const h = await headers();

  // Vercel sætter x-forwarded-for. Første led er klientens adresse; de følgende er
  // proxyerne undervejs og kan sættes af klienten selv, så kun det første bruges.
  const videresendt = h.get("x-forwarded-for");
  const adresse = videresendt?.split(",")[0].trim() || h.get("x-real-ip")?.trim() || "";

  // Lokal udvikling har ingen af de to headere. Alle forsøg havner så i samme
  // spand, hvilket er præcis hvad man vil have i udvikling: grænsen kan prøves.
  const noegle = adresse === "" ? "ukendt-adresse" : adresse;

  return createHash("sha256").update(`${salt}:${noegle}`).digest("hex");
}
