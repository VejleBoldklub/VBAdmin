// Ugegitteret regnet ud som data, adskilt fra det, der tegner det.
//
// Alle tidspunkter i denne fil er minutter siden midnat i dansk tid på en given
// dansk kalenderdag. Bookingernes tidsstempler oversættes én gang på vej ind, og
// derefter regnes der kun i minutter. Det er både billigere og til at
// gennemskue: sammenligner man tidsstempler for hvert kvarter i ugen, skal
// tidszonen med i hver enkelt sammenligning.

import { AABNER_WEEKEND, LUKKER, SNAP, aabnerKl, danskTid } from "./regler";
import type { Optagethed } from "./types";

// Gitteret vises fra weekendens åbningstid til lukketid, altså 09.00–22.00, for
// alle syv dage. Hverdagenes formiddag står som lukket frem for at mangle, så
// søjlerne kan stå side om side og et tidspunkt ligger i samme højde hele ugen.
export const GITTER_FRA = AABNER_WEEKEND;
export const GITTER_TIL = LUKKER;
export const ANTAL_SLOTS = (GITTER_TIL - GITTER_FRA) / SNAP;

export type SlotStatus =
  | "lukket" // uden for dagens åbningstid
  | "fortid" // åbent, men passeret
  | "ledig"
  | "optaget" // bekræftet booking
  | "afventer"; // cafeteria-booking, der venter på godkendelse

export type Segment = {
  status: SlotStatus;
  // Minutter siden midnat, dansk tid.
  fra: number;
  til: number;
  antal: number;
};

type DagBooking = {
  dato: string;
  fra: number;
  til: number;
  status: Optagethed["status"];
};

// Oversætter tidsstemplerne til dansk kalenderdag og minutter.
//
// En booking kan ikke strække sig over midnat: policyen kræver, at den slutter
// senest kl. 22 på startdagen. Skulle en booking oprettet med service_role alligevel
// gøre det, klippes den ved gitterets slutning frem for at give et negativt
// interval, der ville tegne sig som ingenting.
export function tilDagBookinger(bookinger: Optagethed[]): DagBooking[] {
  return bookinger.map((b) => {
    const start = danskTid(new Date(b.start_tid));
    const slut = danskTid(new Date(b.slut_tid));

    return {
      dato: start.dato,
      fra: start.minutter,
      til: slut.dato === start.dato ? slut.minutter : GITTER_TIL,
      status: b.status,
    };
  });
}

export function dagensSlots(
  dato: string,
  isoDag: number,
  bookinger: DagBooking[],
  nu: Date
): SlotStatus[] {
  const aabner = aabnerKl(isoDag);
  const idag = danskTid(nu);
  const paaDagen = bookinger.filter((b) => b.dato === dato);

  const slots: SlotStatus[] = [];

  for (let i = 0; i < ANTAL_SLOTS; i++) {
    const fra = GITTER_FRA + i * SNAP;
    const til = fra + SNAP;

    if (fra < aabner) {
      slots.push("lukket");
      continue;
    }

    // Overlap, ikke indeholdt-i: et kvarter er taget, så snart en booking rører
    // det. Optaget slår afventende, så et kvarter aldrig ser frit ud.
    const bookinger_her = paaDagen.filter((b) => b.fra < til && b.til > fra);
    if (bookinger_her.some((b) => b.status === "bekraeftet")) {
      slots.push("optaget");
      continue;
    }
    if (bookinger_her.length > 0) {
      slots.push("afventer");
      continue;
    }

    // Kun startens position afgør fortid. Et kvarter, der er begyndt, kan ikke
    // bookes — databasen afviser det alligevel, fordi start_tid skal være i
    // fremtiden.
    const passeret = dato < idag.dato || (dato === idag.dato && fra <= idag.minutter);
    slots.push(passeret ? "fortid" : "ledig");
  }

  return slots;
}

// Slår ens kvarterer efter hinanden sammen, så en booking tegnes som én blok med
// én tekst frem for som fire kasser i timen.
export function tilSegmenter(slots: SlotStatus[]): Segment[] {
  const ud: Segment[] = [];

  for (let i = 0; i < slots.length; i++) {
    const status = slots[i];
    const forrige = ud.at(-1);

    if (forrige && forrige.status === status) {
      forrige.til += SNAP;
      forrige.antal++;
      continue;
    }

    const fra = GITTER_FRA + i * SNAP;
    ud.push({ status, fra, til: fra + SNAP, antal: 1 });
  }

  return ud;
}

// Foreslået sluttidspunkt, når brugeren har valgt en start i gitteret.
//
// En time, hvis der er en time fri. Ellers frem til næste optagede kvarter, så
// forslaget aldrig er et tidsrum, databasen vil afvise.
export function foreslaaSlut(slots: SlotStatus[], start: number): number {
  const foersteIndeks = (start - GITTER_FRA) / SNAP;
  const oensket = Math.min(start + 60, GITTER_TIL);

  let slut = start + SNAP;
  for (let i = foersteIndeks + 1; i < slots.length && slut < oensket; i++) {
    if (slots[i] !== "ledig") break;
    slut += SNAP;
  }

  return slut;
}
