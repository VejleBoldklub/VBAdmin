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

## 7. Airtable

Airtable kan senere anvendes som database til administrative moduler, blandt andet:

- brugere, roller og rettigheder
- lokaler og lokalebooking
- cafeteria og kassesystem
- varer, kategorier og priser
- lager
- salg og betalingsformer
- dagsafslutninger og rapporter

Airtable-integrationer skal ligge bag serverkode. API-nøgler eller andre legitimationsoplysninger må aldrig sendes til browseren eller gemmes i repositoryet.

## 8. Hosting, deployment og miljøer

- Vercel er projektets hosting- og deploymentplatform.
- Pull requests skal så vidt muligt have et Vercel Preview Deployment.
- `main` repræsenterer production-koden.
- Production-deployment skal ske fra en godkendt ændring på `main`.
- Miljøspecifik konfiguration og hemmeligheder gemmes som miljøvariabler i Vercel.
- Der må ikke hardcodes production-URL'er, tokens, adgangskoder eller andre miljøspecifikke værdier i koden.
- Miljøvariabler skal valideres server-side og dokumenteres med ufølsomme navne og beskrivelser, eksempelvis i `.env.example`, når de indføres.

## 9. Designprincipper

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

## 10. Kode- og mappestruktur

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
- Offentlige baneplansider må ikke være afhængige af adminlayoutet.

## 11. TypeScript-regler

- TypeScript skal køre i strict mode.
- Undgå `any`. Hvis det undtagelsesvist er nødvendigt, skal det begrundes lokalt og afgrænses.
- Ukendte eksterne data behandles som `unknown` og valideres ved systemgrænsen.
- Datatyper skal afspejle domænet og ikke blot UI'et.
- Der må ikke bruges type assertions til at skjule reelle typefejl.
- Delte typer placeres tæt på det domæne, der ejer dem.
- Server-only data og hemmeligheder må ikke importeres i Client Components.
- Nye ændringer må ikke efterlade TypeScript-fejl.

## 12. Sikkerhed og hemmeligheder

Følgende må aldrig committes:

- API-nøgler
- adgangskoder
- personlige access tokens
- sessionshemmeligheder
- private nøgler
- produktionsdata med personoplysninger

Hemmeligheder gemmes som miljøvariabler i Vercel og bruges kun server-side. Alt input, der kommer ind i systemet, skal valideres, før det anvendes eller gemmes.

Dependencies skal holdes opdaterede, især når der offentliggøres sikkerhedsrettelser til Next.js, React eller andre centrale pakker.

## 13. Branch- og pull request-arbejdsgang

- Der arbejdes aldrig direkte på `main`.
- Hver afgrænset ændring udføres på en ny, beskrivende branch.
- Branches bør følge mønstret `agent/<kort-beskrivende-navn>` for Codex-arbejde.
- Commits skal være små, logiske og have præcise beskeder.
- Én pull request skal have ét tydeligt formål.
- Pull request-beskrivelsen skal forklare ændringen, begrundelsen, bruger-/udviklerpåvirkningen og den udførte validering.
- **Codex må ikke merge direkte til `main`.**
- Merge foretages først efter menneskelig gennemgang og godkendelse.
- Urelaterede ændringer må ikke blandes ind i samme pull request.

## 14. Kvalitetskontrol før merge

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

## 15. Beskyttelse af eksisterende produktion

Repositoryet `VejleBoldklub/Baneplan_VBParken` er den nuværende produktionsløsning og må ikke ændres, flyttes eller afhængiggøres af VBAdmin, før den nye løsning er færdig, testet og udtrykkeligt godkendt til overgang.

Udvikling i `VBAdmin` må ikke afbryde den nuværende offentlige baneplan. En senere migrering skal planlægges særskilt og have en dokumenteret tilbagefaldsplan.

## 16. Udviklingsprincip

Udviklingen foregår **ét modul og én afgrænset ændring ad gangen**.

- Fundamentet færdiggøres før avancerede moduler.
- Et modul skal være stabilt og godkendt, før næste større modul påbegyndes.
- Nye idéer udvider ikke automatisk en igangværende opgaves scope.
- Der bygges ikke spekulative funktioner “til senere”, medmindre deres struktur er nødvendig nu.
- Der må ikke opfindes datamodeller, integrationer eller brugerflows uden en konkret, godkendt opgave.

## 17. Definition of Done

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

## 18. Roadmap

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

- afklaring af eksisterende SuperSaaS-flow og fremtidige integrationer
- lokalemodel og bookingregler
- Airtable som mulig datakilde bag et server-side integrationslag

### Fase 4 — Historik

- registrering af publiceringer og ændringer
- tydelig revisionshistorik
- sikker mulighed for at gendanne tidligere versioner

### Fase 5 — Administration

- brugere, roller og rettigheder
- systemindstillinger
- senere Airtable-understøttelse til administrative data
- forberedelse til cafeteria og andre godkendte moduler
