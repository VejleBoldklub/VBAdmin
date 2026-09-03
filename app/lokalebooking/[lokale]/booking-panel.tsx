"use client";

import { useActionState, useRef, useState } from "react";
import { foreslaaSlut, type Slot } from "@/features/lokalebooking/gitter";
import {
  TOM_INDTASTNING,
  type Indtastning,
  type OpretResultat,
} from "@/features/lokalebooking/formular";
import { kvartererPaaDag, LUKKER, slutKvarterer } from "@/features/lokalebooking/regler";
import { isoDagFor } from "@/features/lokalebooking/uge";
import BookingForm from "./booking-form";
import UgeTabel from "./uge-tabel";

// Binder ugegitteret og formularen sammen.
//
// Der er én kilde til hvad brugeren har valgt. Både et klik i gitteret og et valg
// i formularens felter skriver til den, og gitteret markerer det valgte tidsrum ud
// fra samme værdier. To sæt tilstand ville uundgåeligt komme ud af trit, og så
// ville gitteret vise noget andet end det, der blev sendt.
//
// Formularen ligger i en modal frem for under kalenderen. Grunden er iframen:
// siden vises på klubbens hjemmeside i en kasse med fast højde, og en formular,
// der altid står udfoldet, gør siden dobbelt så høj som den kalender, folk kom
// for at se. Nu fylder siden kalenderen og lidt til.
//
// <dialog> frem for en selvbygget overlay — samme valg som annullér-knappen i
// adminfladen. Browseren giver tastaturfælden, Escape og baggrundsspærringen.
// Modalen kan rulle indeni: i en lav iframe er det forskellen på en formular, man
// kan udfylde, og en, der er klippet over.

type BookingPanelProps = {
  lokaleNavn: string;
  kraeverGodkendelse: boolean;
  datoer: string[];
  slots: Slot[][];
  iDag: string;
  // Minutter siden midnat i dansk tid, da siden blev gengivet. Bruges til at
  // holde passerede kvarterer ude af dagens valgmuligheder.
  nuMinutter: number;
  maksDato: string;
  // Afgør kun, om vejledningen skal stå her. Uden for indlejret tilstand står den
  // i lokalets beskrivelse øverst på siden.
  indlejret: boolean;
  kunneIkkeLaese: boolean;
  handling: (forrige: OpretResultat, fd: FormData) => Promise<OpretResultat>;
};

export default function BookingPanel({
  lokaleNavn,
  kraeverGodkendelse,
  datoer,
  slots,
  iDag,
  nuMinutter,
  maksDato,
  indlejret,
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

  const dialog = useRef<HTMLDialogElement>(null);

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

  const aabn = () => {
    // Kvitteringen fra en tidligere booking lukkes, så modalen åbner på
    // formularen og ikke på svaret fra sidste gang.
    setLukketSvar(resultat);
    dialog.current?.showModal();
  };

  const luk = () => {
    if (venter) return;
    dialog.current?.close();
    setLukketSvar(resultat);
  };

  // Et klik i gitteret gør to ting: vælger tidsrummet og åbner formularen. Uden
  // det andet ville et klik se ud som om der ikke skete noget.
  const vaelgIGitter = (dato: string, start: number) => {
    opdater({ dato, start: String(start), slut: String(foreslaaSlutFor(dato, start)) });
    aabn();
  };

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

      {/* Kun i indlejret tilstand. Udenfor står vejledningen i lokalets
          beskrivelse øverst på siden, og den samme sætning to gange på en side,
          der skal være kort, er én gang for meget.

          Der er ingen knap. Kalenderen er indgangen: hvert ledigt kvarter er en
          rigtig knap, så et klik og et tastetryk gør det samme. */}
      {indlejret && (
        <p className="text-sm leading-6 text-slate-600">
          Klik på en ledig tid i kalenderen for at booke.
        </p>
      )}

      <UgeTabel datoer={datoer} slots={slots} iDag={iDag} valgt={valgt} vaelg={vaelgIGitter} />

      {/* Uden JavaScript kan en modal ikke åbnes. Så ville siden ikke kunne
          bruges til det, den er til, og server action'en virker ellers fint uden
          — den er en almindelig formular. Reglen herunder folder dialogen ud som
          et helt almindeligt afsnit på siden i det tilfælde. */}
      <noscript>
        <style>{`
          dialog.bookingdialog {
            display: block;
            position: static;
            inset: auto;
            margin: 0;
            max-height: none;
            width: 100%;
            border-color: rgb(226 232 240);
          }
        `}</style>
      </noscript>

      <dialog
        ref={dialog}
        // Placeringen skrives eksplicit. En <dialog> centreres normalt af
        // browserens egen regel `inset: 0; margin: auto`, men Tailwinds reset
        // sætter `margin: 0` på alt og slår den ihjel — så lander modalen i
        // øverste venstre hjørne.
        //
        // Vandret centreres den med inset-x-0 og mx-auto. Lodret er den bundet
        // til toppen med en fast afstand frem for at være centreret, og det er
        // et bevidst valg: siden ligger i en iframe med scrolling="no", så
        // iframens "viewport" er hele dens højde. En modal, der centreres i
        // den, kan derfor lande langt nede i en høj iframe — uden for det, den
        // besøgende har på skærmen. Toppen af iframen er det sted, der har
        // størst chance for at være i syne.
        //
        // dvh frem for vh: i en iframe med fast højde er de ens, men på en
        // telefon uden for iframen tager dvh højde for browserlinjen, der kommer
        // og går.
        className="bookingdialog fixed inset-x-0 top-4 mx-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-950/40"
        onClick={(e) => {
          // Klik uden for indholdet lukker. Selve indholdet ligger i en div, så
          // et klik dér ikke rammer dialogen selv.
          if (e.target === dialog.current) luk();
        }}
        onCancel={(e) => {
          // Escape midt i en indsendelse ville lukke vinduet, mens bookingen var
          // undervejs, og efterlade brugeren i tvivl om, hvad der skete.
          if (venter) e.preventDefault();
        }}
      >
        <BookingForm
          lokaleNavn={lokaleNavn}
          kraeverGodkendelse={kraeverGodkendelse}
          indtastning={indtastning}
          saetFelt={saetFelt}
          saetDato={saetDato}
          saetStart={saetStart}
          startMuligheder={mulighederFor(indtastning.dato)}
          slutMuligheder={
            indtastning.start === "" ? [] : slutKvarterer(Number(indtastning.start))
          }
          minDato={iDag}
          maksDato={maksDato}
          formAction={formAction}
          resultat={visning}
          venter={venter}
          luk={luk}
          nulstil={() => {
            setRedigeret(TOM_INDTASTNING);
            setLukketSvar(resultat);
          }}
        />
      </dialog>
    </div>
  );
}
