import { AuthShell } from "@/components/auth-shell";
import GlemtForm from "./glemt-form";

// Nulstilling af glemt adgangskode.
//
// Ruten er offentlig og ligger uden for matcheren i proxy.ts — den, der har
// glemt sin adgangskode, kan i sagens natur ikke logge ind først.
//
// Invitationsflowet dækker kun første gang. Denne side dækker resten, og de to
// deler både /auth/bekraeft og siden, hvor adgangskoden sættes.
export const dynamic = "force-dynamic";

export default function GlemtKodeordPage() {
  return (
    <AuthShell
      title="Glemt adgangskode"
      undertitel="Skriv din e-mail, så sender vi et link, hvor du kan vælge en ny adgangskode."
    >
      <GlemtForm />
    </AuthShell>
  );
}
