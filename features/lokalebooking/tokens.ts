import { createHash, randomBytes } from "node:crypto";

// Engangstokens til godkendelses- og afvisningslinkene i notifikationsmailen.
//
// Kun hashen gemmes. Et databaseudtræk giver derfor ikke i sig selv ret til at
// godkende noget — det ville det, hvis tokenet lå i klartekst, og en
// cafeteria-booking kunne så godkendes af enhver, der havde set tabellen.
//
// Der bruges ingen salt, modsat IP-hashene i ip.ts. Salt beskytter mod, at en
// hash kan regnes baglæns ved at prøve alle mulige input igennem, og det er kun
// en trussel, når mængden af mulige input er lille — som med IPv4-adresser. Et
// token på 256 tilfældige bit kan ikke opregnes.

// 32 byte fra en kryptografisk generator. base64url, så tokenet kan stå i en
// URL uden at skulle kodes om undervejs.
export function nytToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Tokens fra URL'en er brugerinput. Formen tjekkes, før der slås op, så en
// tilfældig streng ikke bliver til en databaseforespørgsel.
export function erTokenForm(vaerdi: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(vaerdi);
}
