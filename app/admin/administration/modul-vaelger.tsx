"use client";

// Fra @/lib/moduler, ikke @/lib/adgang. Sidstnævnte importerer
// service_role-klienten, og den ville følge med i browserbundtet herfra.
import { MODULER, type Modul } from "@/lib/moduler";

export const MODUL_NAVNE: Record<Modul, string> = {
  baneplan: "Baneplan",
  lokalebooking: "Lokalebooking",
  infoskaerm: "Infoskærm",
};

// Afkrydsning pr. modul. Slået fra for administratorer, som har adgang til alt
// uanset hvad der står her — feltet ville ellers give indtryk af, at det kunne
// begrænse dem.
export function ModulVaelger({
  valgte,
  erAdministrator,
  onSkift,
  navnePraefiks,
}: {
  valgte: Modul[];
  erAdministrator: boolean;
  onSkift: (moduler: Modul[]) => void;
  navnePraefiks: string;
}) {
  return (
    <fieldset className="flex flex-wrap gap-x-5 gap-y-2" disabled={erAdministrator}>
      <legend className="sr-only">Moduler</legend>

      {MODULER.map((modul) => (
        <label
          key={modul}
          className={`flex items-center gap-2 text-sm ${
            erAdministrator ? "text-slate-400" : "text-slate-700"
          }`}
        >
          <input
            type="checkbox"
            name={`${navnePraefiks}-${modul}`}
            className="h-4 w-4 rounded border-slate-300 accent-red-700"
            checked={erAdministrator || valgte.includes(modul)}
            onChange={(e) =>
              onSkift(
                e.target.checked ? [...valgte, modul] : valgte.filter((m) => m !== modul)
              )
            }
          />
          {MODUL_NAVNE[modul]}
        </label>
      ))}

      {erAdministrator && (
        <span className="text-xs text-slate-500">Administratorer har adgang til alt.</span>
      )}
    </fieldset>
  );
}
