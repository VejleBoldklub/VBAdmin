"use client";

import { useEffect, useRef } from "react";

// Åbner browserens printdialog, hvor "Gem som PDF" ligger.
//
// Dialogen åbnes af sig selv, når fanen er indlæst, så vejen fra knappen i
// editoren til en fil på disken er ét klik. Knappen bliver stående, fordi
// dialogen kan være lukket ved et uheld — og fordi en side, der kun kan printes
// automatisk, er en side man ikke kan printe igen.
export default function PrintKnap() {
  const harPrintet = useRef(false);

  useEffect(() => {
    // React kører effekter to gange i udvikling. Uden vagten ville dialogen
    // komme igen, så snart man lukkede den første.
    if (harPrintet.current) return;
    harPrintet.current = true;
    window.print();
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-red-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 print:hidden"
    >
      Print / gem som PDF
    </button>
  );
}
