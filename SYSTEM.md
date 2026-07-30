# Vejle Boldklub Admin — systemgrundlag

## 1. Dokumentets status

Dette dokument er projektets faste grundlag for udviklingen af **Vejle Boldklub Admin (VBAdmin)**. Det beskriver de beslutninger og regler, som skal følges ved alle fremtidige ændringer.

Hvis en opgave strider mod dette dokument, skal modstriden afklares, før arbejdet fortsætter. Dokumentet må kun ændres bevidst og i en særskilt pull request med en tydelig begrundelse.

## 2. Formål

VBAdmin skal være Vejle Boldklubs fælles, webbaserede indgang til administrative værktøjer. Systemet skal være enkelt at bruge, sikkert at videreudvikle og kunne udvides modul for modul uden at eksisterende funktioner bygges om unødigt.

Den første prioritet er at etablere et stabilt fundament og et baneplanmodul. Senere kan systemet udvides med lokalebooking, historik, brugeradministration og andre klubfunktioner.

## 3. Overordnede arkitekturprincipper

- Projektet bygges som en Next.js-applikation med App Router.
- TypeScript anvendes i hele kodebasen.
- Tailwind CSS anvendes til styling.
- Vercel anvendes til hosting, preview-deployments og production-deployment.
- GitHub-repositoryet `VejleBoldklub/VBAdmin` er kilden til kode og versionshistorik.
- Klientkode, serverkode, domænelogik og integrationer skal holdes tydeligt adskilt.
- Server Components er standard. Client Components bruges kun, når browserinteraktivitet kræver det.
- Eksterne systemer skal tilgås gennem afgrænsede integrationslag, ikke direkte fra vilkårlige UI-komponenter.
- Der må ikke bygges falske integrationer, dummy-login eller knapper, som foregiver at udføre handlinger.
- Nye arkitekturvalg skal dokumenteres, hvis de ændrer projektets grundlæggende struktur.

## 4. Faste moduler

VBAdmin skal som minimum have følgende moduler:

1. **Dashboard**
2. **Baneplan**
   - Efterår / Forår
   - Vinter
3. **Lokalebooking**
   - Mødelokale
   - Cafeteria
4. **Historik**
5. **Administration**

Fremtidige moduler, eksempelvis cafeteria og kassesystem, skal kunne tilføjes uden at ændre de eksisterende modulers ansvar.

## 5. Dashboard

Dashboardet er en enkel indgang til systemets moduler.

Dashboardet må ikke indeholde:

- nyheder eller meddelelser
- statistik
- aktivitetsfeeds
- tilfældige widgets
- vejrinformation eller andet uvedkommende indhold

Dashboardet skal kun vise relevante modulkort og tydelig navigation. Moduler, som endnu ikke er implementeret, skal markeres ærligt som **Kommer senere** og må ikke fremstå som fungerende.

## 6. Baneplan

Der findes to permanente baneplantyper:

- **Efterår / Forår**
- **Vinter**

De offentlige ruter er faste og må ikke indeholde årstal:

- `/baneplan/efteraar-foraar`
- `/baneplan/vinter`

Begge ruter skal kunne anvendes samtidig i Klub CMS i overgangsperioder. URL'erne genbruges fra sæson til sæson, og disse offentlige sider i VBAdmin er dem, der fortsat vises i DBU Klub CMS' iframe.

De synlige sæsontitler må ændres årligt, eksempelvis:

- `Efterår '26 / Forår '27`
- `Vinter '26 / '27`

Sæsontitlen er indhold og må ikke bruges som en del af den permanente URL.

### Dataflow for baneplan

Baneplanen redigeres direkte i VBAdmin, ikke i et eksternt system. Det faste dataflow er:

`Live plan → kopi til kladde ("sandkasse") → redigering → preview → publicering → manuel indtastning i KlubOffice`

En redigering tager altid udgangspunkt i en kopi af den aktuelt gældende (live) plan. Kladden ligger i en afgrænset "sandkasse" og påvirker aldrig den offentlige/live plan, før den aktivt publiceres af en bruger.

Når en kladde publiceres, bliver den den nye live-plan på den faste offentlige rute, og den forrige live-plan arkiveres (den overskrives ikke, men bevares i historikken).

Efter publicering i VBAdmin indtaster brugeren planen manuelt i KlubOffice, så den vises korrekt på de enkelte holds undersider. **KlubOffice er ikke en datakilde til VBAdmin**, og der skal ikke bygges nogen import eller synkronisering fra KlubOffice til VBAdmin.

Airtable må **ikke** anvendes som datakilde til baneplanen.

## 7. Lokalebooking

Modulet erstatter den tidligere SuperSaaS-baserede rumbooking. Datakilden er Supabase, ikke Airtable — begrundelsen står i afsnittet om Airtable nedenfor.

Der findes to bookbare lokaler med hver sine regler:

- **Mødelokale (1. sal)** — bookes direkte og er bekræftet med det samme
- **Cafeteria** — oprettes som `afventer` og skal godkendes af klubben, før bookingen er endelig

Offentlige ruter, beregnet til at vises i en iframe på klubbens hjemmeside:

- `/lokalebooking/moedelokale`
- `/lokalebooking/cafeteria`

Adminfladen er én samlet rute bag login, ikke en side pr. lokale:

- `/admin/lokalebooking` — alle bookinger for begge lokaler, med filtre på lokale, status og periode i URL'en, og en fremhævet kø over cafeteria-bookinger, der venter på godkendelse

Godkendelse og afvisning skrives med service_role. Afvisning kræver en begrundelse, som gemmes på bookingen, og begge dele sætter `besluttet_af = 'admin'` og `besluttet_tid`. Opdateringen er betinget af, at bookingen stadig afventer, så to administratorer ikke kan overskrive hinandens beslutning.

Handlingerne kontrollerer selv, at kaldet kommer fra en indlogget administrator. At `proxy.ts` beskytter `/admin` er ikke nok: en server action er et POST-endepunkt, der slås op på sit id og derfor kan forsøges ramt fra enhver rute i appen — også de offentlige, som med vilje ikke er bag login. Af samme grund ligger læsningen af bookinger i et modul **uden** `"use server"`: den returnerer navn, mail og mobil, og et `"use server"`-modul ville gøre hver eksport til et endepunkt.

Ugen står i URL'en som `?uge=2026-W32`, så et link til en bestemt uge kan deles. Er ugen ugyldig, vises den aktuelle uge frem for en fejlside.

Bookingregler: kvarterers præcision, åbent kl. 14.00–22.00 på hverdage og kl. 09.00–22.00 i weekenden, mindst 15 minutter og højst 8 timer, højst 6 måneder frem, og en booking må ikke strække sig over midnat. Alle tider er danske, uanset hvor brugeren eller serveren står.

**Reglerne håndhæves i databasen, ikke i brugerfladen.** Den offentlige rute bruger anon-nøglen, og enhver kan kalde Supabase' API direkte med den. At siden ligger bag klubbens Trænerlogin i en iframe er en bekvemmelighed for brugerne, ikke en sikkerhedsgrænse. Derfor ligger spærrerne i `supabase/lokalebooking-skema.sql`:

- dobbeltbooking er umulig, håndhævet af en udelukkelsesregel på tabellen
- en afventende cafeteria-booking holder tidsrummet, så to personer ikke kan få håb om samme tid
- rækkesikkerheden afviser en cafeteria-booking, der forsøger at starte som `bekraeftet`
- anons insert-rettighed er kolonnebegrænset, så token- og beslutningsfelter ikke kan sættes udefra
- anon har ingen select-rettighed på bookingtabellen. Optagethed læses gennem viewet `lokale_optagethed`, som ikke indeholder navn, mail eller mobil

Kontrollerne i `features/lokalebooking/` er derfor til for brugerens skyld: de giver en forståelig besked frem for en rå databasefejl, og de gør det muligt at tegne kalenderen. De to sæt regler skal holdes i takt, og enhver ændring i det ene sted skal spejles i det andet.

Fordi anon ikke kan læse rækken tilbage, genererer serverkoden selv bookingens UUID og sender det med ved oprettelsen. Id'et skal bruges til links i de mails, modulet senere sender.

Spam-forsvar: et skjult honeypot-felt og en tælling af forsøg pr. IP-adresse. Kun en saltet hash af adressen gemmes, aldrig adressen selv, og rækkerne ryddes efter et døgn. Grænsen er sat højere end funktionens default, fordi klubbens medlemmer booker fra samme net. Mangler `BOOKING_IP_SALT`, afvises alle bookinger.

Nye kolonner, som brugeren skal kunne udfylde, skal både oprettes i skemaet og tilføjes i `grant insert`-listen. Glemmes det sidste, fejler oprettelsen med en rettighedsfejl.

Endnu ikke bygget: notifikations- og bekræftelsesmails med engangstokens, godkendelse fra et mail-link, bookerens egen sletning gennem et mail-link (databasefunktionen `slet_egen_booking` findes, men har ingen brugerflade), og svarheaderne der tillader indlejring fra klubbens domæne.

## 8. Airtable

Airtable kan senere anvendes som database til administrative moduler, blandt andet:

- brugere, roller og rettigheder
- cafeteria og kassesystem
- varer, kategorier og priser
- lager
- salg og betalingsformer
- dagsafslutninger og rapporter

Airtable-integrationer skal ligge bag serverkode. API-nøgler eller andre legitimationsoplysninger må aldrig sendes til browseren eller gemmes i repositoryet.

Airtable må **ikke** anvendes som datakilde til lokalebooking. Modulet bruger Supabase, ligesom baneplanen. Begrundelsen er, at bookinger skal håndhæve regler, som kun en database kan garantere — særligt at dobbeltbooking er umulig, hvilket kræver en udelukkelsesregel på tabellen, ikke en kontrol i applikationen. Dertil kommer, at endnu en datakilde ville betyde endnu et integrationslag og endnu en nøgle at beskytte.

## 9. Hosting, deployment og miljøer

- Vercel er projektets hosting- og deploymentplatform.
- Pull requests skal så vidt muligt have et Vercel Preview Deployment.
- `main` repræsenterer production-koden.
- Production-deployment skal ske fra en godkendt ændring på `main`.
- Miljøspecifik konfiguration og hemmeligheder gemmes som miljøvariabler i Vercel.
- Der må ikke hardcodes production-URL'er, tokens, adgangskoder eller andre miljøspecifikke værdier i koden.
- Miljøvariabler skal valideres server-side og dokumenteres med ufølsomme navne og beskrivelser, eksempelvis i `.env.example`, når de indføres.

## 10. Designprincipper

Brugerfladen skal være:

- moderne, enkel og professionel
- lys og overskuelig
- konsekvent på tværs af moduler
- responsiv og mobile first
- tilgængelig med tastatur og relevante hjælpetekster

Faste designvalg:

- skrifttype: **Roboto**
- primære farver: rød, hvid og mørkegrå
- meget lys grå kan bruges til flader og afgrænsning
- VB-rød anvendes som accentfarve, ikke som støjende heldækkende standard
- **Times New Roman og andre serif-skrifttyper må ikke anvendes**
- korrekt VB-logo skal anvendes som et eksisterende aktiv; der må ikke opfindes eller AI-genereres et nyt logo

Layoutet skal fungere på mobil, tablet og desktop uden utilsigtet vandret scrolling i adminfladen. Interaktive elementer skal have tydelige fokusmarkeringer og tilstrækkelige klikflader.

## 11. Kode- og mappestruktur

Projektet skal følge en tydelig, domæneorienteret struktur. Den konkrete struktur kan udvikle sig, men følgende ansvar skal holdes adskilt:

- `app/`: routes, layouts og route-specifik sammensætning
- `components/`: genbrugelige UI-komponenter
- `features/` eller tilsvarende: modulspecifik funktionalitet og domænelogik
- `lib/`: fælles serverfunktioner, klientuafhængige hjælpefunktioner og integrationer
- `types/`: delte TypeScript-typer, når de ikke naturligt hører til et enkelt modul
- `public/`: statiske, offentlige aktiver

Regler:

- Undgå store monolitiske komponenter.
- Del ikke kode op alene for opdelingens skyld; komponenter skal have et klart ansvar.
- Genbrug eksisterende komponenter og mønstre, før nye varianter oprettes.
- Fælles designværdier og UI-mønstre skal være konsistente.
- Domænelogik må ikke skjules i præsentationskomponenter.
- Offentlige sider — baneplaner og lokalebooking — må ikke være afhængige af adminlayoutet. De vises i en iframe, hvor klubbens CMS leverer logo og overskrift, og de må derfor heller ikke tegne klubbens header selv.

## 12. TypeScript-regler

- TypeScript skal køre i strict mode.
- Undgå `any`. Hvis det undtagelsesvist er nødvendigt, skal det begrundes lokalt og afgrænses.
- Ukendte eksterne data behandles som `unknown` og valideres ved systemgrænsen.
- Datatyper skal afspejle domænet og ikke blot UI'et.
- Der må ikke bruges type assertions til at skjule reelle typefejl.
- Delte typer placeres tæt på det domæne, der ejer dem.
- Server-only data og hemmeligheder må ikke importeres i Client Components.
- Nye ændringer må ikke efterlade TypeScript-fejl.

## 13. Sikkerhed og hemmeligheder

Følgende må aldrig committes:

- API-nøgler
- adgangskoder
- personlige access tokens
- sessionshemmeligheder
- private nøgler
- produktionsdata med personoplysninger

Hemmeligheder gemmes som miljøvariabler i Vercel og bruges kun server-side. Alt input, der kommer ind i systemet, skal valideres, før det anvendes eller gemmes.

Dependencies skal holdes opdaterede, især når der offentliggøres sikkerhedsrettelser til Next.js, React eller andre centrale pakker.

## 14. Branch- og pull request-arbejdsgang

- Der arbejdes aldrig direkte på `main`.
- Hver afgrænset ændring udføres på en ny, beskrivende branch.
- Branches bør følge mønstret `agent/<kort-beskrivende-navn>` for Codex-arbejde.
- Commits skal være små, logiske og have præcise beskeder.
- Én pull request skal have ét tydeligt formål.
- Pull request-beskrivelsen skal forklare ændringen, begrundelsen, bruger-/udviklerpåvirkningen og den udførte validering.
- **Codex må ikke merge direkte til `main`.**
- Merge foretages først efter menneskelig gennemgang og godkendelse.
- Urelaterede ændringer må ikke blandes ind i samme pull request.

## 15. Kvalitetskontrol før merge

Før en pull request kan merges, skal relevante kontroller være bestået:

- installation af dependencies
- lint
- TypeScript-kontrol
- production build
- relevante automatiske tests, når de findes
- manuel kontrol af påvirkede brugerflows
- responsiv kontrol på relevante skærmstørrelser ved UI-ændringer
- Vercel Preview Deployment, når det er muligt

Kendte kritiske eller høje sikkerhedsproblemer i centrale dependencies skal afklares eller rettes før merge. Sikkerhedsopdateringer må ikke ignoreres alene, fordi applikationen stadig bygger.

Hvis en kontrol ikke kan køres, skal årsagen og risikoen dokumenteres tydeligt i pull requesten.

## 16. Beskyttelse af eksisterende produktion

Repositoryet `VejleBoldklub/Baneplan_VBParken` er den nuværende produktionsløsning og må ikke ændres, flyttes eller afhængiggøres af VBAdmin, før den nye løsning er færdig, testet og udtrykkeligt godkendt til overgang.

Udvikling i `VBAdmin` må ikke afbryde den nuværende offentlige baneplan. En senere migrering skal planlægges særskilt og have en dokumenteret tilbagefaldsplan.

## 17. Udviklingsprincip

Udviklingen foregår **ét modul og én afgrænset ændring ad gangen**.

- Fundamentet færdiggøres før avancerede moduler.
- Et modul skal være stabilt og godkendt, før næste større modul påbegyndes.
- Nye idéer udvider ikke automatisk en igangværende opgaves scope.
- Der bygges ikke spekulative funktioner “til senere”, medmindre deres struktur er nødvendig nu.
- Der må ikke opfindes datamodeller, integrationer eller brugerflows uden en konkret, godkendt opgave.

## 18. Definition of Done

En ændring er først færdig, når:

1. Det aftalte scope er implementeret uden urelaterede ændringer.
2. Koden følger dette dokument og projektets eksisterende mønstre.
3. UI'et er responsivt og tilgængeligt, hvis ændringen påvirker brugerfladen.
4. Fejltilstande og tomme tilstande er håndteret relevant.
5. Ingen hemmeligheder eller følsomme data er tilføjet repositoryet.
6. Lint, TypeScript-kontrol, build og relevante tests er bestået.
7. Kendte relevante sikkerhedsadvarsler er håndteret eller dokumenteret.
8. Dokumentation er opdateret, når adfærd, opsætning eller arkitektur ændres.
9. Pull requesten er gennemgået og godkendt af et menneske.
10. Codex har ikke selv merget ændringen til `main`.

## 19. Roadmap

### Fase 1 — Fundament

- stabil Next.js-, TypeScript- og Tailwind-struktur
- fælles design og responsiv navigation
- dashboard med modulkort
- Vercel-deployment og sikker branch-/PR-proces
- projektregler og dokumentation

### Fase 2 — Baneplan

- integration af den eksisterende visuelle baneplan i VBAdmin
- permanente offentlige ruter for Efterår / Forår og Vinter
- redigerbare sæsontitler
- "kopiér live til kladde"-funktion, så redigering altid sker i en afgrænset sandkasse
- validering, preview og kontrolleret publicering af kladden til den offentlige, faste rute
- historik over tidligere live-versioner ved publicering

### Fase 3 — Lokalebooking

Modulet erstatter den nuværende SuperSaaS-baserede rumbooking. Der migreres ingen historik fra SuperSaaS.

- Supabase som datakilde, med dobbeltbooking forhindret af en udelukkelsesregel i databasen
- to bookbare ressourcer: mødelokale og cafeteria, med hver sine regler for godkendelse
- offentlig, indlejringsegnet rute til brug i en iframe på klubbens hjemmeside, adskilt fra adminfladen
- den offentlige rute skal kunne oprette bookinger, ikke kun læse. Det sker med en anon-nøgle bag rækkesikkerhed, adskilt fra adminfladens service_role-klient
- godkendelsesflow for cafeteria, både fra adminfladen og fra et link i en notifikationsmail
- e-mail som eneste identitetsmekanisme indtil videre. Sporing af hvem der booker via DBU-login er udskudt, indtil adgangen til DBU's API er afklaret

### Fase 4 — Historik

- registrering af publiceringer og ændringer
- tydelig revisionshistorik
- sikker mulighed for at gendanne tidligere versioner

### Fase 5 — Administration

- brugere, roller og rettigheder
- systemindstillinger
- senere Airtable-understøttelse til administrative data
- forberedelse til cafeteria og andre godkendte moduler
