import { notFound } from "next/navigation";
import { supabasePublic } from "@/lib/supabase-public";
import { hentPlayerData } from "@/lib/signage/data";
import { SLUG_FORM } from "@/lib/signage/typer";
import Player from "./player";

// Playeren: den adresse, en skærm i Skærme Alliancen peger på.
//
// Offentlig med vilje — en skærm har ingen at logge ind. Den er derfor ikke
// omfattet af matcheren i proxy.ts, og den læser med anon-nøglen bag
// rækkesikkerheden. Første playliste tegnes på serveren, så skærmen viser
// noget med det samme; derefter henter playeren selv nye ændringer.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Skærm: ${slug} — Vejle Boldklub`, robots: { index: false, follow: false } };
}

export default async function SignagePlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!SLUG_FORM.test(slug)) notFound();

  let data = null;
  let fejl = false;
  try {
    data = await hentPlayerData(supabasePublic(), slug);
  } catch (err) {
    fejl = true;
    // Playeren prøver selv igen. En sort skærm, der kommer sig, er bedre end en
    // fejlside, der bliver stående.
    console.error("Signage: første playliste kunne ikke hentes:", err);
  }

  // Ukendt adresse er en fejlside; en database, der ikke svarer, er det ikke.
  if (!data && !fejl) notFound();

  return <Player slug={slug} initial={data} forhaand={sp.forhaand === "1"} />;
}
