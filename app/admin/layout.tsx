import type { ReactNode } from "react";
import { Inaktivitetsvagt } from "@/components/inaktivitetsvagt";

// Layoutet findes alene for at lægge Inaktivitetsvagt om hele adminfladen.
//
// Den tegner ikke noget selv. Adminsiderne bruger AdminPageShell til rammen, og
// den skal blive der: siderne har forskellige bredder, og det er sidens eget
// valg, ikke layoutets.
//
// Vagten ligger her og ikke i app/layout.tsx, fordi rodlayoutet også dækker de
// offentlige ruter — baneplanerne, lokalebookingen og kioskskærmen. Kioskskærmen
// skal netop kunne stå urørt i timevis, og ingen af dem har en session at logge
// ud af.
//
// Forsiden ligger uden for /admin og har sin egen. Se app/page.tsx.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Inaktivitetsvagt />
    </>
  );
}
