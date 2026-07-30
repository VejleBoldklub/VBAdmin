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

// Et kvarter i gitteret: hvad det er, og hvilken booking der holder det.
//
// booking er null for alt andet end optaget og afventende. Den er med, fordi
// kalenderen skal vise bookingens oplysninger — se types.ts om hvorfor de er
// offentlige.
export type Slot = {
  status: SlotStatus;
  booking: DagBooking | null;
};

export type Segment = {
  status: SlotStatus;
  // Minutter siden midnat, dansk tid.
  fra: number;
  til: number;
  antal: number;
  booking: DagBooking | null;
};

export type DagBooking = {
  dato: string;
  fra: number;
  til: number;
  status: Optagethed["status"];
  formaal: string;
  hold: string | null;
  navn: string;
  email: string;
  mobil: string;
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
      formaal: b.formaal,
      hold: b.hold,
      navn: b.navn,
      email: b.email,
      mobil: b.mobil,
    };
  });
}

export function dagensSlots(
  dato: string,
  isoDag: number,
  bookinger: DagBooking[],
  nu: Date
): Slot[] {
  const aabner = aabnerKl(isoDag);
  const idag = danskTid(nu);
  const paaDagen = bookinger.filter((b) => b.dato === dato);

  const slots: Slot[] = [];

  for (let i = 0; i < ANTAL_SLOTS; i++) {
    const fra = GITTER_FRA + i * SNAP;
    const til = fra + SNAP;

    if (fra < aabner) {
      slots.push({ status: "lukket", booking: null });
      continue;
    }

    // Overlap, ikke indeholdt-i: et kvarter er taget, så snart en booking rører
    // det. Optaget slår afventende, så et kvarter aldrig ser frit ud.
    const bookinger_her = paaDagen.filter((b) => b.fra < til && b.til > fra);
    const bekraeftet = bookinger_her.find((b) => b.status === "bekraeftet");
    if (bekraeftet) {
      slots.push({ status: "optaget", booking: bekraeftet });
      continue;
    }
    if (bookinger_her.length > 0) {
      slots.push({ status: "afventer", booking: bookinger_her[0] });
      continue;
    }

    // Kun startens position afgør fortid. Et kvarter, der er begyndt, kan ikke
    // bookes — databasen afviser det alligevel, fordi start_tid skal være i
    // fremtiden.
    const passeret = dato < idag.dato || (dato === idag.dato && fra <= idag.minutter);
    slots.push({ status: passeret ? "fortid" : "ledig", booking: null });
  }

  return slots;
}

// Slår ens kvarterer efter hinanden sammen, så en booking tegnes som én blok med
// én tekst frem for som fire kasser i timen.
// To kvarterer slaas kun sammen, hvis de har samme status OG hoerer til samme
// booking. Uden det sidste ville to bookinger lige efter hinanden blive tegnet
// som én blok med den foerstes oplysninger.
export function tilSegmenter(slots: Slot[]): Segment[] {
  const ud: Segment[] = [];

  for (let i = 0; i < slots.length; i++) {
    const { status, booking } = slots[i];
    const forrige = ud.at(-1);

    if (forrige && forrige.status === status && forrige.booking === booking) {
      forrige.til += SNAP;
      forrige.antal++;
      continue;
    }

    const fra = GITTER_FRA + i * SNAP;
    ud.push({ status, fra, til: fra + SNAP, antal: 1, booking });
  }

  return ud;
}

// Foreslået sluttidspunkt, når brugeren har valgt en start i gitteret.
//
// En time, hvis der er en time fri. Ellers frem til næste optagede kvarter, så
// forslaget aldrig er et tidsrum, databasen vil afvise.
export function foreslaaSlut(slots: Slot[], start: number): number {
  const foersteIndeks = (start - GITTER_FRA) / SNAP;
  const oensket = Math.min(start + 60, GITTER_TIL);

  let slut = start + SNAP;
  for (let i = foersteIndeks + 1; i < slots.length && slut < oensket; i++) {
    if (slots[i].status !== "ledig") break;
    slut += SNAP;
  }

  return slut;
}
