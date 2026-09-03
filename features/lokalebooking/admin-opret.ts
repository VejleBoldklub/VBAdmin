"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { kraevAdgang } from "@/lib/adgang";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  SPRING_OVER_FELT,
  type AdminIndtastning,
  type AdminOpretResultat,
  type Konflikt,
  type PlanlagtDato,
} from "./admin-formular";
import { tekstFra, tjekFelter, tomTilNull } from "./felter";
import { findLokale, type Lokale } from "./lokaler";
import { sendMail } from "./mail";
import {
  bekraeftelseTilBooker,
  serieBekraeftelseTilBooker,
  type MailBooking,
} from "./mail-tekster";
import {
  danskTidTilInstant,
  minutterFraTekst,
  REGELBRUD_TEKST,
  tidsrumDelt,
  tidsrumTekst,
  tjekTidsrum,
  type Regelbrud,
} from "./regler";
import { erGentagelse, serieDatoer, serieTekst, type Afslutning, type Gentagelse } from "./serie";

// Oprettelse af bookinger fra adminfladen, med mulighed for at gentage dem.
//
// Hvorfor en handling for sig, og ikke en udvidelse af opret.ts:
//
//   Den offentlige rute skriver med anon-nøglen bag rækkesikkerhed. Policyen
//   kræver blandt andet, at en cafeteria-booking starter som 'afventer', og den
//   giver ikke ret til at sætte serie_id. Begge dele er med vilje — det er dem,
//   der forhindrer, at man kan godkende sin egen booking eller hægte sig på en
//   andens serie.
//
//   Denne fil skriver med service_role, som omgår rækkesikkerheden. Det er
//   nødvendigt for at kunne sætte serie_id og for at kunne oprette en bekræftet
//   cafeteria-booking: admin ER godkenderen, og en booking, klubben selv lægger
//   ind, skal ikke først i sin egen godkendelseskø.
//
//   Prisen er, at policyens regler ikke gælder her. De skal derfor håndhæves i
//   koden nedenfor, og det er den eneste grund til, at tjekTidsrum() kaldes for
//   hver eneste dato i serien frem for at blive overladt til databasen.
//
// Det, databasen stadig håndhæver på egen hånd, er dét, der er en constraint og
// ikke en policy: kvarterspræcision, højst otte timer, slut efter start — og
// udelukkelsesreglen, der gør dobbeltbooking fysisk umulig. Konflikttjekket her
// er derfor en brugerflade, ikke en garanti: det findes for at kunne vise listen
// og spørge, før noget gemmes.

const ADMIN_STI = "/admin/lokalebooking";

const IKKE_ADMIN =
  "Du er ikke logget ind som administrator længere. Genindlæs siden og prøv igen.";
const GENERISK = "Bookingerne kunne ikke oprettes. Prøv igen.";

// Loft på konfliktopslaget. Én forespørgsel dækker hele seriens spænd for ét
// lokale, og seks måneders bookinger i ét lokale ligger langt under dette tal.
// Grænsen er der for at et opslag aldrig kan hente et ubegrænset antal rækker.
const MAKS_EKSISTERENDE = 2000;

function laesIndtastning(fd: FormData): AdminIndtastning {
  return {
    lokale: tekstFra(fd, "lokale"),
    dato: tekstFra(fd, "dato"),
    start: tekstFra(fd, "start"),
    slut: tekstFra(fd, "slut"),
    formaal: tekstFra(fd, "formaal"),
    hold: tekstFra(fd, "hold"),
    navn: tekstFra(fd, "navn"),
    email: tekstFra(fd, "email"),
    mobil: tekstFra(fd, "mobil"),
    besked: tekstFra(fd, "besked"),
    gentagelse: tekstFra(fd, "gentagelse"),
    afslutning: tekstFra(fd, "afslutning"),
    slutdato: tekstFra(fd, "slutdato"),
    antal: tekstFra(fd, "antal"),
  };
}

type Planlagt = PlanlagtDato & { start: Date; slut: Date };

// Regelbrud samles pr. type frem for pr. dato. En serie på tyve tirsdage, der
// alle ligger før åbningstid, er ét problem med én rettelse — tyve enslydende
// linjer ville skjule det frem for at forklare det.
function regelfejl(planlagte: Planlagt[], nu: Date): string[] {
  const ramte = new Map<Regelbrud, string[]>();

  for (const p of planlagte) {
    for (const brud of tjekTidsrum(p.start, p.slut, nu)) {
      const dage = ramte.get(brud) ?? [];
      dage.push(p.dag);
      ramte.set(brud, dage);
    }
  }

  return [...ramte].map(([brud, dage]) =>
    dage.length === 1
      ? `${REGELBRUD_TEKST[brud]} — ${dage[0]}`
      : `${REGELBRUD_TEKST[brud]} Det gælder ${dage.length} af datoerne, første gang ${dage[0]}.`
  );
}

type EksisterendeRaekke = {
  start_tid: string;
  slut_tid: string;
  status: "afventer" | "bekraeftet";
  formaal: string;
  navn: string;
};

// De bookinger, der allerede holder tid i lokalet inden for seriens spænd.
//
// Ét opslag for hele serien frem for ét pr. dato. En serie kan være tyve datoer,
// og tyve forespørgsler ville gøre en oprettelse mærkbart langsom uden at give et
// bedre svar — overlappet regnes lige så præcist her.
//
// Kun 'afventer' og 'bekraeftet' tæller, præcis som udelukkelsesreglen i
// databasen: en afvist eller aflyst booking holder ikke tiden.
async function hentEksisterende(
  lokale: Lokale,
  fra: Date,
  til: Date
): Promise<EksisterendeRaekke[] | null> {
  const { data, error } = await supabaseAdmin
    .from("lokale_bookinger")
    .select("start_tid,slut_tid,status,formaal,navn")
    .eq("lokale", lokale.slug)
    .in("status", ["afventer", "bekraeftet"])
    .lt("start_tid", til.toISOString())
    .gt("slut_tid", fra.toISOString())
    .order("start_tid", { ascending: true })
    .limit(MAKS_EKSISTERENDE);

  if (error) {
    console.error(`Kunne ikke hente eksisterende bookinger til konflikttjek: ${error.message}`);
    return null;
  }

  return (data ?? []) as unknown as EksisterendeRaekke[];
}

export async function opretAdminBooking(
  _forrige: AdminOpretResultat,
  fd: FormData
): Promise<AdminOpretResultat> {
  const vaerdier = laesIndtastning(fd);
  const fejl = (linjer: string[]): AdminOpretResultat => ({
    tilstand: "fejl",
    fejl: linjer,
    vaerdier,
  });

  // Handlingen kontrollerer selv sin adgang. En server action slås op på sit id
  // og kan rammes fra enhver rute i appen, også de offentlige — at proxy.ts
  // beskytter /admin er ikke nok. Se lib/adgang.ts.
  if (!(await kraevAdgang("lokalebooking"))) {
    console.error("Afvist forsøg på at oprette en booking uden gyldig admin-adgang.");
    return fejl([IKKE_ADMIN]);
  }

  const lokale = findLokale(vaerdier.lokale);
  if (!lokale) return fejl(["Vælg et lokale."]);

  const feltfejl = tjekFelter(vaerdier);

  const startMin = minutterFraTekst(vaerdier.start);
  const slutMin = minutterFraTekst(vaerdier.slut);
  const gyldigDato = /^\d{4}-\d{2}-\d{2}$/.test(vaerdier.dato);

  if (!gyldigDato || startMin === null || slutMin === null) {
    feltfejl.push("Vælg dato, start og slut.");
    return fejl(feltfejl);
  }

  // Gentagelsen. Tom værdi betyder én enkelt booking — så er resten af
  // serie-felterne uden betydning og læses ikke.
  let gentagelse: Gentagelse | null = null;
  if (vaerdier.gentagelse !== "") {
    if (!erGentagelse(vaerdier.gentagelse)) {
      feltfejl.push("Vælg et gyldigt gentagelsesmønster.");
      return fejl(feltfejl);
    }
    gentagelse = vaerdier.gentagelse;
  }

  let datoer = [vaerdier.dato];

  if (gentagelse) {
    // Kun den valgte metodes felt læses. Ellers kunne et tal, der blev stående i
    // det skjulte felt, afgøre seriens længde, uden at nogen havde set det.
    const afslutning: Afslutning =
      vaerdier.afslutning === "slutdato"
        ? { slags: "slutdato", dato: vaerdier.slutdato }
        : { slags: "antal", antal: Number(vaerdier.antal) };

    const serie = serieDatoer(vaerdier.dato, gentagelse, afslutning);
    if (!serie.ok) {
      feltfejl.push(serie.fejl);
      return fejl(feltfejl);
    }
    datoer = serie.datoer;
  }

  if (feltfejl.length > 0) return fejl(feltfejl);

  const nu = new Date();

  const planlagte: Planlagt[] = datoer.map((dato) => {
    const start = danskTidTilInstant(dato, startMin);
    const slut = danskTidTilInstant(dato, slutMin);
    const { dag, klokke } = tidsrumDelt(start, slut);
    return { dato, dag, klokke, start, slut };
  });

  const brud = regelfejl(planlagte, nu);
  if (brud.length > 0) return fejl(brud);

  const eksisterende = await hentEksisterende(
    lokale,
    planlagte[0].start,
    planlagte[planlagte.length - 1].slut
  );

  if (eksisterende === null) return fejl([GENERISK]);

  // Halvåbent interval, ligesom tstzrange '[)' i skemaet: en booking, der slutter
  // præcis når den næste begynder, er ikke en konflikt.
  const konflikter: Konflikt[] = [];
  const ledige: Planlagt[] = [];

  for (const p of planlagte) {
    const spaerrer = eksisterende.find(
      (e) =>
        new Date(e.start_tid).getTime() < p.slut.getTime() &&
        new Date(e.slut_tid).getTime() > p.start.getTime()
    );

    if (spaerrer) {
      const { dag, klokke } = tidsrumDelt(
        new Date(spaerrer.start_tid),
        new Date(spaerrer.slut_tid)
      );
      konflikter.push({
        dato: p.dato,
        dag,
        klokke,
        formaal: spaerrer.formaal,
        navn: spaerrer.navn,
        status: spaerrer.status,
      });
    } else {
      ledige.push(p);
    }
  }

  // Første indsendelse med konflikter gemmer ingenting. Admin får listen og
  // vælger selv, om de øvrige datoer skal oprettes, eller om hele oprettelsen
  // skal droppes — det er netop derfor kontrollen ligger før alt skrivearbejde.
  const springOver = fd.get(SPRING_OVER_FELT) === "1";

  if (konflikter.length > 0 && !springOver) {
    return {
      tilstand: "konflikt",
      konflikter,
      ledige: ledige.map(({ dato, dag, klokke }) => ({ dato, dag, klokke })),
      vaerdier,
    };
  }

  if (ledige.length === 0) {
    return fejl([
      "Alle datoerne er optaget, så der er ikke noget at oprette. Vælg et andet tidsrum.",
    ]);
  }

  // Serie-id'et genereres her og deles af alle rækker i serien. Er der ingen
  // gentagelse, er der ingen serie, og feltet bliver null — en enkeltbooking skal
  // ikke se ud som en serie på én.
  const serieId = gentagelse ? randomUUID() : null;
  const besluttetTid = nu.toISOString();

  const raekker = ledige.map((p) => ({
    id: randomUUID(),
    lokale: lokale.slug,
    start_tid: p.start.toISOString(),
    slut_tid: p.slut.toISOString(),
    // Bekræftet med det samme, også for cafeteriet. Bookingen er lagt ind af den,
    // der ellers skulle godkende den, og en tur gennem godkendelseskøen ville
    // være en formalitet, klubben selv skulle klikke sig igennem.
    status: "bekraeftet" as const,
    formaal: vaerdier.formaal,
    hold: tomTilNull(vaerdier.hold),
    navn: vaerdier.navn,
    email: vaerdier.email,
    mobil: vaerdier.mobil,
    besked: tomTilNull(vaerdier.besked),
    serie_id: serieId,
    // Ikke pynt: det er de to felter, der siger, at bookingen er sat af et
    // menneske i adminfladen og ikke er kommet ind gennem den offentlige rute.
    besluttet_af: "admin" as const,
    besluttet_tid: besluttetTid,
  }));

  // Én indsættelse for hele serien. Postgres kører den som én transaktion, så
  // enten står alle rækkerne, eller også står ingen af dem — der kan ikke blive
  // efterladt en halv serie, hvis en tid bliver taget undervejs.
  const { error } = await supabaseAdmin.from("lokale_bookinger").insert(raekker);

  if (error) {
    // 23P01 er udelukkelsesreglen: en tid blev taget mellem konflikttjekket og
    // indsættelsen. Sjældent, men muligt, og det er præcis den situation,
    // databasen er den eneste, der kan afgøre.
    if (error.code === "23P01") {
      return fejl([
        "En af tiderne blev booket af en anden, mens du bekræftede. Der er ikke oprettet noget — prøv igen.",
      ]);
    }

    console.error(`Adminoprettelsen blev afvist af databasen (${error.code ?? "ukendt"}): ${error.message}`);
    return fejl([GENERISK]);
  }

  await varslBooker(lokale, vaerdier, ledige, gentagelse);

  revalidatePath(ADMIN_STI);
  revalidatePath(lokale.publicPath);

  return {
    tilstand: "ok",
    lokaleNavn: lokale.navn,
    oprettede: ledige.map(({ dato, dag, klokke }) => ({ dato, dag, klokke })),
    sprunget: konflikter.length,
    serieTekst: gentagelse ? serieTekst(gentagelse, ledige.length) : null,
  };
}

// Kvitteringen til bookeren. Én mail, uanset hvor mange datoer serien har.
//
// Samme regel som resten af modulet: ingen mail må kunne vælte det, den handler
// om. Bookingerne står i databasen, og de bliver stående, selv om mailserveren er
// nede — der logges og gås videre.
async function varslBooker(
  lokale: Lokale,
  vaerdier: AdminIndtastning,
  oprettede: Planlagt[],
  gentagelse: Gentagelse | null
): Promise<void> {
  try {
    const data: MailBooking = {
      lokaleNavn: lokale.navn,
      naar: tidsrumTekst(oprettede[0].start, oprettede[0].slut),
      formaal: vaerdier.formaal,
      hold: tomTilNull(vaerdier.hold),
      navn: vaerdier.navn,
      email: vaerdier.email,
      mobil: vaerdier.mobil,
      besked: tomTilNull(vaerdier.besked),
    };

    const svarTil = lokale.ansvarligEmail;

    const indhold =
      gentagelse === null
        ? // Én booking: den almindelige kvittering. kraeverGodkendelse er false,
          // fordi bookingen allerede ER bekræftet — teksten må ikke bede
          // modtageren vente på et svar, der aldrig kommer.
          bekraeftelseTilBooker(data, false, svarTil !== null)
        : serieBekraeftelseTilBooker(
            data,
            oprettede.map((p) => tidsrumTekst(p.start, p.slut)),
            serieTekst(gentagelse, oprettede.length),
            svarTil !== null
          );

    await sendMail({
      til: vaerdier.email,
      emne: indhold.emne,
      html: indhold.html,
      tekst: indhold.tekst,
      svarTil,
    });
  } catch (e) {
    console.error(
      `Bookingerne blev oprettet, men kvitteringen til ${vaerdier.email} fejlede: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
