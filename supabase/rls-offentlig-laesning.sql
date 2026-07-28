-- Rækkesikkerhed for offentlig læsning af baneplaner
-- ==================================================
--
-- Formål: give de offentlige ruter /baneplan/efteraar-foraar og /baneplan/vinter
-- adgang til at læse den gældende plan, uden at bruge service_role-nøglen.
--
-- Kør hele filen i Supabase → SQL Editor. Den er idempotent og kan køres igen.
--
-- Filen slår SELV rækkesikkerhed til på tabellen. Den forudsætter altså ikke, at
-- det er gjort i konsollen først.

-- 1) Slå rækkesikkerhed til. Uden dette trin ignoreres policyen nedenfor, og
--    anon-nøglen kan læse alt i tabellen, også kladder og arkiverede planer.
--    Kommandoen kan køres flere gange uden effekt anden gang.
alter table baneplan_versioner enable row level security;

-- 2) Policyen. drop først, fordi create policy fejler hvis navnet findes.
drop policy if exists "offentlig laesning af live-planer" on baneplan_versioner;

create policy "offentlig laesning af live-planer"
  on baneplan_versioner
  for select
  to anon
  using (status = 'live');

-- Hvad det betyder
-- ================
--
-- anon kan læse rækker med status = 'live' og intet andet. Kladder ('draft') og
-- arkiverede planer ('archived') er utilgængelige for den offentlige side, også
-- hvis en fejl i koden skulle forsøge at hente dem.
--
-- service_role OMGÅR rækkesikkerhed. Kladde-editoren i adminfladen bruger den
-- nøgle og er derfor upåvirket af dette script.
--
-- Bemærk fejltilstanden: mangler policyen, får anon et TOMT svar frem for en
-- fejl. Den offentlige side vil da vise "Der er endnu ikke publiceret en
-- baneplan", selvom der findes en live-plan. Ser du det, så kontrollér først at
-- dette script er kørt.

-- Kontrol
-- =======
--
-- Er rækkesikkerhed slået til?
--   select relname, relrowsecurity
--     from pg_class
--    where relname = 'baneplan_versioner';
--   -- relrowsecurity skal være true
--
-- Findes policyen, og hvad tillader den?
--   select policyname, roles, cmd, qual
--     from pg_policies
--    where tablename = 'baneplan_versioner';
