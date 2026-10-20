"use client";

import { useEffect, useRef } from "react";
import { CATEGORIES, HALVDELE, type Category, type Halvdel } from "@/features/baneplan/types";
import { categorySwatch } from "./event-styles";

type CategoryMenuProps = {
  x: number;
  y: number;
  current: Category;
  onPick: (kategori: Category) => void;
  // Handlingerne hører til en tildeling, der findes. Udelades de, er menuen ren
  // kategorivælger — det er sådan "+ Tilføj tildeling" bruger den, hvor der
  // endnu ikke er noget at duplikere eller slette.
  onDuplicate?: () => void;
  onDelete?: () => void;
  // Hele banen eller en halvdel. Udelades onPickHalv, vises valget ikke — som
  // ved "+ Tilføj tildeling", hvor bredden sættes bagefter.
  halv?: Halvdel | null;
  onPickHalv?: (halv: Halvdel | null) => void;
  onClose: () => void;
};

const MENU_W = 208;
// Højderne bruges kun til at holde menuen inde i vinduet. Overskrift og fem
// kategorier er basis; skillelinjen og de to handlinger lægger resten til.
const MENU_H_BASIS = 192;
const MENU_H_HANDLINGER = 76;
// Bredden: skillelinje, overskrift og tre valg.
const MENU_H_BREDDE = 136;

// Vises når man klikker kategori-chippen i boksens hjørne, ved højreklik på
// boksen, og når en ny tildeling skal have en kategori. Ligger med fixed
// position, fordi boksen selv har overflow-hidden og ellers ville klippe menuen.
export default function CategoryMenu({
  x,
  y,
  current,
  onPick,
  onDuplicate,
  onDelete,
  halv = null,
  onPickHalv,
  onClose,
}: CategoryMenuProps) {
  const harHandlinger = Boolean(onDuplicate || onDelete);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Flyt fokus ind i menuen, så tastaturbrugere kan nå den.
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  useEffect(() => {
    function udenfor(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function paaTast(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    // pointerdown frem for click, så menuen lukker før et nyt træk begynder.
    document.addEventListener("pointerdown", udenfor, true);
    document.addEventListener("keydown", paaTast, true);
    return () => {
      document.removeEventListener("pointerdown", udenfor, true);
      document.removeEventListener("keydown", paaTast, true);
    };
  }, [onClose]);

  // Hold menuen inde i vinduet, også når boksen ligger nede i højre hjørne.
  const hoejde =
    MENU_H_BASIS + (harHandlinger ? MENU_H_HANDLINGER : 0) + (onPickHalv ? MENU_H_BREDDE : 0);
  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - hoejde - 8));

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={harHandlinger ? "Kategori og handlinger" : "Kategori for ny tildeling"}
      className="fixed z-50 w-52 rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl"
      style={{ left, top }}
    >
      <p className="px-3 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {harHandlinger ? "Kategori" : "Ny tildeling"}
      </p>
      {CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          role="menuitemradio"
          aria-checked={c.value === current}
          onClick={() => onPick(c.value)}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${
            c.value === current ? "font-bold text-slate-950" : "text-slate-700"
          }`}
        >
          <span className={`h-3 w-3 shrink-0 rounded-full ${categorySwatch(c.value)}`} />
          {c.label}
          {c.value === current && <span className="ml-auto text-xs text-slate-400">✓</span>}
        </button>
      ))}

      {onPickHalv && (
        <>
          <hr className="my-1.5 border-slate-100" />
          <p className="px-3 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Bredde
          </p>
          {HALVDELE.map((h) => (
            <button
              key={h.label}
              type="button"
              role="menuitemradio"
              aria-checked={h.value === halv}
              onClick={() => onPickHalv(h.value)}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${
                h.value === halv ? "font-bold text-slate-950" : "text-slate-700"
              }`}
            >
              <BreddeIkon halv={h.value} />
              {h.label}
              {h.value === halv && <span className="ml-auto text-xs text-slate-400">✓</span>}
            </button>
          ))}
        </>
      )}

      {harHandlinger && <hr className="my-1.5 border-slate-100" />}

      {onDuplicate && (
        <button
          type="button"
          role="menuitem"
          onClick={onDuplicate}
          className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
        >
          Dupliker
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          role="menuitem"
          onClick={onDelete}
          className="w-full px-3 py-1.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
        >
          Slet tildeling
        </button>
      )}
    </div>
  );
}

// Lille bane med den brugte del udfyldt, så valget kan ses og ikke kun læses.
function BreddeIkon({ halv }: { halv: Halvdel | null }) {
  return (
    <span className="flex h-3 w-4 shrink-0 overflow-hidden rounded-sm border border-slate-400">
      <span className={`h-full w-1/2 ${halv !== "hoejre" ? "bg-slate-400" : ""}`} />
      <span className={`h-full w-1/2 ${halv !== "venstre" ? "bg-slate-400" : ""}`} />
    </span>
  );
}
