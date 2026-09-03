// Formen på adminfladens egen oprettelsesformular, delt mellem serverhandlingen
// og brugerfladen.
//
// Egen fil af samme grund som formular.ts: admin-opret.ts er et "use server"-
// modul og må kun eksportere asynkrone funktioner. En type eller en konstant
// derinde får `next build` til at fejle, og klientkoden har brug for begge.

// Feltet, der bærer admins svar på konfliktdialogen. Sendes som værdien på den
// knap, der siger "opret de øvrige", så valget følger med indsendelsen frem for
// at ligge i en tilstand, der kan komme ud af trit med formularen.
export const SPRING_OVER_FELT = "spring_konflikter_over";

export type AdminIndtastning = {
  // Lokalets slug. Adminfladen opretter for begge lokaler fra samme formular, så
  // dette felt kommer med fra brugeren — modsat den offentlige rute, hvor lokalet
  // er bundet på serveren ud fra ruten.
  lokale: string;
  // Datoen for den FØRSTE booking. Er der valgt en gentagelse, er det seriens
  // startdato.
  dato: string;
  // Minutter siden midnat som tekst, ligesom på den offentlige formular.
  start: string;
  slut: string;
  formaal: string;
  hold: string;
  navn: string;
  email: string;
  mobil: string;
  besked: string;
  // "" betyder en enkelt booking uden gentagelse. Ellers en Gentagelse fra
  // serie.ts.
  gentagelse: string;
  // "slutdato" eller "antal". Kun den valgte metodes felt læses, så et gammelt
  // tal i det andet felt ikke kan snige sig med.
  afslutning: string;
  slutdato: string;
  antal: string;
};

export const TOM_ADMIN_INDTASTNING: AdminIndtastning = {
  lokale: "",
  dato: "",
  start: "",
  slut: "",
  formaal: "",
  hold: "",
  navn: "",
  email: "",
  mobil: "",
  besked: "",
  gentagelse: "",
  afslutning: "antal",
  slutdato: "",
  antal: "10",
};

// En dato i den planlagte serie, skrevet ud som den skal vises.
export type PlanlagtDato = {
  // "ÅÅÅÅ-MM-DD". Bruges som nøgle i lister.
  dato: string;
  dag: string;
  klokke: string;
};

// En eksisterende booking, der spærrer for en af seriens datoer.
//
// Indeholder formål og navn. Det er persondata, men listen vises udelukkende i
// adminfladen bag login, hvor de samme oplysninger står i bookinglisten lige
// nedenunder — og uden dem kan admin ikke afgøre, om konflikten er en, der skal
// respekteres, eller klubbens egen booking, der skal flyttes.
export type Konflikt = {
  dato: string;
  dag: string;
  klokke: string;
  formaal: string;
  navn: string;
  status: "afventer" | "bekraeftet";
};

export type AdminOpretResultat =
  | { tilstand: "uroert" }
  // Indtastningen sendes med tilbage, så formularen kan fyldes ud igen. Samme
  // grund som på den offentlige rute: React nulstiller en formular, når en server
  // action er kørt, og bliver den sendt før hydrering, er svaret det eneste sted,
  // værdierne findes.
  | { tilstand: "fejl"; fejl: string[]; vaerdier: AdminIndtastning }
  // Ingenting er gemt. Admin skal vælge, om de øvrige datoer skal oprettes, eller
  // om hele oprettelsen skal droppes.
  | {
      tilstand: "konflikt";
      konflikter: Konflikt[];
      ledige: PlanlagtDato[];
      vaerdier: AdminIndtastning;
    }
  | {
      tilstand: "ok";
      lokaleNavn: string;
      oprettede: PlanlagtDato[];
      // Hvor mange datoer der blev sprunget over, fordi de var optaget.
      sprunget: number;
      // Sat, hvis bookingerne hører til en serie. Bruges kun til teksten i
      // kvitteringen.
      serieTekst: string | null;
    };
