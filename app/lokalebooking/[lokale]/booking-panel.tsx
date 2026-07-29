"use client";

import { useActionState, useState } from "react";
import { foreslaaSlut, type SlotStatus } from "@/features/lokalebooking/gitter";
import {
  TOM_INDTASTNING,
  type Indtastning,
  type OpretResultat,
} from "@/features/lokalebooking/formular";
import { kvartererPaaDag, LUKKER, MAKS_VARIGHED, SNAP } from "@/features/lokalebooking/regler";
import { isoDagFor } from "@/features/lokalebooking/uge";
import BookingForm from "./booking-form";
import UgeTabel from "./uge-tabel";

// Binder ugegitteret og formularen sammen.
//
// Der er én kilde til hvad brugeren har valgt. Både et klik i gitteret og et valg
// i formularens felter skriver til den, og gitteret markerer det valgte tidsrum ud
// fra samme værdier. To sæt tilstand ville uundgåeligt komme ud af trit, og så
// ville gitteret vise noget andet end det, der blev sendt.

type BookingPanelProps = {
  lokaleNavn: string;
  kraeverGodkendelse: boolean;
  datoer: string[];
  slots: SlotStatus[][];
  iDag: string;
  // Minutter siden midnat i dansk tid, da siden blev gengivet. Bruges til at
  // holde passerede kvarterer ude af dagens valgmuligheder.
  nuMinutter: number;
  maksDato: string;
  kunneIkkeLaese: boolean;
  handling: (forrige: OpretResultat, fd: FormData) => Promise<OpretResultat>;
};

// Sluttider der kan vælges: fra et kvarter efter start til lukketid, dog højst
// otte timer. Samme grænser som tjekTidsrum og som check-reglerne i databasen.
function slutMulighederFor(start: number): number[] {
  const ud: number[] = [];
  for (let m = start + SNAP; m <= Math.min(LUKKER, start + MAKS_VARIGHED); m += SNAP) {
    ud.push(m);
  }
  return ud;
}

export default function BookingPanel({
  lokaleNavn,
  kraeverGodkendelse,
  datoer,
  slots,
  iDag,
  nuMinutter,
  maksDato,
  kunneIkkeLaese,
  handling,
}: BookingPanelProps) {
  const [resultat, formAction, venter] = useActionState<OpretResultat, FormData>(handling, {
    tilstand: "uroert",
  });

  // Kun det brugeren selv har rørt, ligger i tilstand. Er der ikke rørt noget,
  // udledes felterne af serverens svar.
  //
  // Det ser omvendt ud, men er det, der gør at formularen også virker, før
  // JavaScript er indlæst: bliver den sendt inden hydrering og afvist, findes der
  // ingen klienttilstand, og de indtastede værdier kan kun komme fra svaret. Efter
  // hydrering vinder brugerens egen indtastning, som den skal.
  const [redigeret, setRedigeret] = useState<Indtastning | null>(null);

  // Hvilket svar brugeren har lukket med "Book en mere". useActionState har ingen
  // nulstilling, så svaret gemmes væk frem for at blive kastet bort — og et NYT
  // svar vises igen af sig selv, fordi det er et andet objekt end det lukkede.
  const [lukketSvar, setLukketSvar] = useState<OpretResultat | null>(null);

  const indtastning: Indtastning =
    redigeret ?? (resultat.tilstand === "fejl" ? resultat.vaerdier : TOM_INDTASTNING);

  const visning: OpretResultat = resultat === lukketSvar ? { tilstand: "uroert" } : resultat;

  const opdater = (aendring: Partial<Indtastning>) =>
    setRedigeret({ ...indtastning, ...aendring });

  // Starttider der kan vælges på en given dag. Passerede kvarterer i dag tages ud:
  // databasen afviser dem alligevel, fordi start_tid skal ligge i fremtiden, og en
  // valgmulighed, der altid fejler, er værre end ingen.
  function mulighederFor(dato: string): number[] {
    if (dato === "") return [];
    const alle = kvartererPaaDag(isoDagFor(dato));
    return dato === iDag ? alle.filter((m) => m > nuMinutter) : alle;
  }

  // Forslaget tager hensyn til de optagede kvarterer, når dagen er en af de syv,
  // der vises. Vælger brugeren en dato uden for ugen i datofeltet, kendes
  // optagetheden ikke, og forslaget bliver en time.
  function foreslaaSlutFor(dato: string, start: number): number {
    const dagIndeks = datoer.indexOf(dato);
    if (dagIndeks === -1) return Math.min(start + 60, LUKKER);
    return foreslaaSlut(slots[dagIndeks], start);
  }

  const saetFelt = (felt: keyof Indtastning, vaerdi: string) => opdater({ [felt]: vaerdi });

  // En ny dato kan gøre det valgte starttidspunkt ulovligt: kl. 09.00 findes i
  // weekenden, men ikke på en hverdag. Starten flyttes derfor til dagens første
  // mulige kvarter frem for at stå med en værdi, serveren vil afvise.
  const saetDato = (dato: string) => {
    if (dato === "" || indtastning.start === "") {
      opdater({ dato, start: "", slut: "" });
      return;
    }

    const muligheder = mulighederFor(dato);
    if (muligheder.length === 0) {
      opdater({ dato, start: "", slut: "" });
      return;
    }

    const start = muligheder.includes(Number(indtastning.start))
      ? Number(indtastning.start)
      : muligheder[0];

    opdater({ dato, start: String(start), slut: String(foreslaaSlutFor(dato, start)) });
  };

  const saetStart = (start: string) => {
    if (start === "") {
      opdater({ start: "", slut: "" });
      return;
    }
    opdater({ start, slut: String(foreslaaSlutFor(indtastning.dato, Number(start))) });
  };

  const vaelgIGitter = (dato: string, start: number) =>
    opdater({ dato, start: String(start), slut: String(foreslaaSlutFor(dato, start)) });

  const valgt =
    indtastning.dato !== "" && indtastning.start !== "" && indtastning.slut !== ""
      ? {
          dato: indtastning.dato,
          start: Number(indtastning.start),
          slut: Number(indtastning.slut),
        }
      : null;

  return (
    <div className="space-y-5">
      {kunneIkkeLaese && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Oversigten over optagede tider kunne ikke hentes. Du kan godt sende en booking, men
          kontrollér med klubben, om tiden er ledig.
        </p>
      )}

      <UgeTabel datoer={datoer} slots={slots} iDag={iDag} valgt={valgt} vaelg={vaelgIGitter} />

      <BookingForm
        lokaleNavn={lokaleNavn}
        kraeverGodkendelse={kraeverGodkendelse}
        indtastning={indtastning}
        saetFelt={saetFelt}
        saetDato={saetDato}
        saetStart={saetStart}
        startMuligheder={mulighederFor(indtastning.dato)}
        slutMuligheder={indtastning.start === "" ? [] : slutMulighederFor(Number(indtastning.start))}
        minDato={iDag}
        maksDato={maksDato}
        formAction={formAction}
        resultat={visning}
        venter={venter}
        nulstil={() => {
          setRedigeret(TOM_INDTASTNING);
          setLukketSvar(resultat);
        }}
      />
    </div>
  );
}
