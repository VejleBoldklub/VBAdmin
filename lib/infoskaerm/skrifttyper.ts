import { Bebas_Neue, Lobster, Montserrat, Oswald, Permanent_Marker, Playfair_Display, Poppins } from "next/font/google";
import type { SkriftNoegle } from "./design";

// Skrifttyperne, man kan vælge i infoskærmens designeditor.
//
// De hentes gennem next/font og ligger dermed på vores eget domæne, ikke hos
// Google. Kiosken skal ikke afhænge af en ekstra tjeneste for at tegne teksten
// rigtigt. Roboto indlæses allerede i app/layout.tsx og genbruges.
//
// Kun klassenavnene med CSS-variablerne bruges, ikke selve skrifttypens
// klasse. Så indlæses filerne først, når en tekst faktisk bruger skrifttypen.

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], variable: "--font-bebas", weight: "400", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const lobster = Lobster({ subsets: ["latin"], variable: "--font-lobster", weight: "400", display: "swap" });
const marker = Permanent_Marker({ subsets: ["latin"], variable: "--font-marker", weight: "400", display: "swap" });

// Sættes på det element, der omslutter lærredet.
export const skriftVariabler = [montserrat, poppins, oswald, bebas, playfair, lobster, marker]
  .map((s) => s.variable)
  .join(" ");

const FAMILIE: Record<SkriftNoegle, string> = {
  roboto: "var(--font-roboto), Arial, sans-serif",
  montserrat: "var(--font-montserrat), Arial, sans-serif",
  poppins: "var(--font-poppins), Arial, sans-serif",
  oswald: "var(--font-oswald), 'Arial Narrow', sans-serif",
  bebas: "var(--font-bebas), Impact, sans-serif",
  playfair: "var(--font-playfair), Georgia, serif",
  lobster: "var(--font-lobster), cursive",
  marker: "var(--font-marker), cursive",
};

export function skriftFamilie(noegle: SkriftNoegle): string {
  return FAMILIE[noegle];
}
