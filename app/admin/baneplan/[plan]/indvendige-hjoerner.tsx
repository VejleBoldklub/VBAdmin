import type { CSSProperties } from "react";
import { KANT_PX, type SegmentKant } from "@/features/baneplan/layout";
import type { Category } from "@/features/baneplan/types";
import { categoryClass } from "./event-styles";

// Radius på et rundet hjørne — Tailwinds rounded-md, som de udvendige hjørner
// har.
const RADIUS_PX = 6;
const STR = RADIUS_PX + KANT_PX;

type Hjoerne = "topVenstre" | "topHoejre" | "bundVenstre" | "bundHoejre";

// Hvor stykket sidder i forhold til det smalle segment, og hvor cirklen, der
// skæres ud, har sit centrum (stykkets hjørne længst fra segmentet).
const placering: Record<Hjoerne, { style: CSSProperties; centrum: string }> = {
  topVenstre: { style: { top: 0, right: "100%" }, centrum: "0% 100%" },
  topHoejre: { style: { top: 0, left: "100%" }, centrum: "100% 100%" },
  bundVenstre: { style: { bottom: 0, right: "100%" }, centrum: "0% 0%" },
  bundHoejre: { style: { bottom: 0, left: "100%" }, centrum: "100% 0%" },
};

// Runde indvendige hjørner ved et sving — hvor en tildelings smalle segment
// møder dens brede nabo, og hjørnet vender indad. De udvendige hjørner klarer
// border-radius, men den kan kun runde et hjørne udad.
//
// Hvert hjørne er et lille kvadrat lige uden for det smalle segment, i
// vinklen mellem dets lodrette kant og naboens vandrette. Kvadratet fyldes med
// tildelingens farve, bortset fra en kvartcirkel i det fjerne hjørne. Randen af
// den kvartcirkel tegnes i kantfarven og bliver dermed den runde kant.
//
// Kvadratet rækker KANT_PX ind over de to lige kanter, så det også dækker det
// skarpe hjørne, som de to kanter ellers danner, hvor de mødes.
//
// Farverne kommer fra categoryClass, så hjørnet altid har samme farve som
// boksen: det nederste lag er udfyldt med kantfarven (en kant så tyk, at den
// fylder hele kvadratet), det øverste med baggrunden. Hvert lag maskeres med en
// cirkel — det øverste med en KANT_PX større — så der står en bue i kantfarven
// tilbage mellem dem.
//
// Skal sidde i segmentets yderste element, og det må ikke klippe med
// overflow-hidden, da hjørnerne ligger uden for det.
export function IndvendigeHjoerner({ kant, category }: { kant: SegmentKant; category: Category }) {
  const hjoerner: Hjoerne[] = [];
  if (kant.indadTopVenstre) hjoerner.push("topVenstre");
  if (kant.indadTopHoejre) hjoerner.push("topHoejre");
  if (kant.indadBundVenstre) hjoerner.push("bundVenstre");
  if (kant.indadBundHoejre) hjoerner.push("bundHoejre");

  return hjoerner.map((h) => {
    const { style, centrum } = placering[h];
    const maske = (r: number): CSSProperties => {
      // En halv pixels overgang, så buen ikke står takket.
      const m = `radial-gradient(circle at ${centrum}, transparent ${r - 0.5}px, #000 ${r + 0.5}px)`;
      return { maskImage: m, WebkitMaskImage: m };
    };
    return (
      <span
        key={h}
        aria-hidden
        className="pointer-events-none absolute"
        style={{ ...style, width: STR, height: STR }}
      >
        <span
          className={`absolute inset-0 ${categoryClass(category)}`}
          style={{ borderWidth: STR / 2, borderStyle: "solid", ...maske(RADIUS_PX) }}
        />
        <span
          className={`absolute inset-0 ${categoryClass(category)}`}
          style={{ borderWidth: 0, ...maske(RADIUS_PX + KANT_PX) }}
        />
      </span>
    );
  });
}
