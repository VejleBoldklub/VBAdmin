-- Lokalebooking: tabeller, regler og rækkesikkerhed
-- =================================================
--
-- Kør hele filen i Supabase → SQL Editor. Den er idempotent og kan køres igen.
--
-- Modulet erstatter den SuperSaaS-baserede rumbooking. To ressourcer,
-- mødelokale og cafeteria, med hver sine regler for godkendelse.
--
-- Det bærende princip: reglerne skal håndhæves i databasen, ikke i brugerfladen.
-- Den offentlige bookingrute bruger anon-nøglen og kan kaldes direkte mod API'et
-- af enhver — at siden ligger bag klubbens Trænerlogin i en iframe er en
-- bekvemmelighed for brugerne, ikke en sikkerhedsgrænse. Derfor skal
-- rækkesikkerheden og constraints kunne stå helt alene.

-- btree_gist er nødvendig for at kunne kombinere lighed på lokale med
-- overlap på tidsinterval i én udelukkelsesregel.
create extension if not exists btree_gist;


-- 1) Bookinger
-- ============

create table if not exists lokale_bookinger (
  id                  uuid primary key default gen_random_uuid(),
  lokale              text not null check (lokale in ('moedelokale','cafeteria')),

  start_tid           timestamptz not null,
  slut_tid            timestamptz not null,

  -- Genereret interval, udelukkende til udelukkelsesreglen nedenfor. Appen
  -- læser og skriver de to almindelige tidsstempler, som er langt nemmere at
  -- arbejde med gennem PostgREST og i TypeScript.
  tidsrum             tstzrange generated always as
                        (tstzrange(start_tid, slut_tid, '[)')) stored,

  -- afventer   cafeteria, indtil Sine har godkendt
  -- bekraeftet mødelokale straks, cafeteria efter godkendelse
  -- afvist     cafeteria, afvist ved godkendelse
  -- aflyst     slettet af booker eller admin, bevaret som spor hvis ønsket
  status              text not null check (status in
                        ('afventer','bekraeftet','afvist','aflyst')),

  formaal             text not null check (length(btrim(formaal)) between 1 and 200),

  -- Frit tekstfelt, valgfrit. Klubben bruger det til at se hvilket hold en
  -- booking hører til, men mange bookinger har intet hold, og feltet må derfor
  -- ikke kunne blokere en oprettelse. Tom streng normaliseres til null i
  -- serverkoden, så "ikke udfyldt" kun har én repræsentation i databasen.
  hold                text check (hold is null or length(btrim(hold)) between 1 and 100),

  navn                text not null check (length(btrim(navn)) between 2 and 100),
  email               text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  mobil               text not null check (length(btrim(mobil)) between 6 and 20),
  besked              text check (besked is null or length(besked) <= 2000),

  -- Engangstokens til de to links i notifikationsmailen til den lokaleansvarlige:
  -- godkend_token_hash bag /godkend/<token> og slet_token_hash bag /afvis/<token>.
  -- Kun hash gemmes, så et databaseudtræk ikke i sig selv giver ret til at
  -- godkende eller afvise.
  --
  -- slet_token_hash hed sådan, fordi kolonnen oprindeligt var tænkt til bookerens
  -- eget slettelink. Det link findes ikke endnu, og de to ting kan ikke dele
  -- kolonne: afvisningslinket sendes til den cafeteriaansvarlige, slettelinket
  -- ville gå til bookeren. Skal bookeren en dag kunne slette selv, kræver det
  -- derfor en ny kolonne — genbrug ikke denne til begge dele.
  --
  -- Ingen af dem må sættes af den offentlige rute — se policyen nedenfor, der
  -- kræver at de er null ved oprettelse. De sættes af serverkode med
  -- service_role, når notifikationsmailen sendes. Kunne anon sætte dem, kunne
  -- man vælge sit eget token og derefter godkende sin egen cafeteria-booking.
  godkend_token_hash  text,
  slet_token_hash     text,

  besluttet_af        text check (besluttet_af in ('mail','admin')),
  besluttet_tid       timestamptz,
  afvisningsgrund     text check (afvisningsgrund is null or length(afvisningsgrund) <= 500),

  -- Gentagne bookinger. Hver forekomst i en serie er en helt almindelig,
  -- selvstændig række — samme datamodel som en enkeltbooking, samme regler,
  -- samme udelukkelsesregel. serie_id er det eneste, der binder dem sammen, og
  -- den er null på alt, der ikke er oprettet som en serie.
  --
  -- Det er med vilje ikke en fremmednøgle til en serie-tabel. En serie har ingen
  -- egenskaber ud over sine bookinger: mønstret er brugt én gang, ved
  -- oprettelsen, og en tabel til det ville skulle holdes i takt med rækker, der
  -- bagefter kan aflyses enkeltvis. Et delt id er nok til at kunne slå de
  -- sammenhørende bookinger op og til at aflyse dem samlet.
  --
  -- Kolonnen er IKKE med i grant insert-listen for anon nedenfor, og skal ikke
  -- være det. Serier oprettes udelukkende fra adminfladen med service_role; kunne
  -- den offentlige rute sætte den, kunne enhver hægte sin booking på en andens
  -- serie og få den aflyst sammen med den.
  serie_id            uuid,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint slut_efter_start check (slut_tid > start_tid),

  -- Alt ligger på kvarterer. 900 sekunder = 15 minutter.
  constraint kvarter_praecist check (
    extract(epoch from start_tid)::bigint % 900 = 0 and
    extract(epoch from slut_tid)::bigint  % 900 = 0
  ),

  constraint hoejst_otte_timer check (slut_tid - start_tid <= interval '8 hours')
);

-- Bemærk hvad der IKKE kan være en constraint: "højst 6 måneder frem" og "ikke
-- i fortiden" bruger now(), som ikke er immutable, og constraints kræver
-- immutable udtryk. De regler ligger i rækkesikkerhedspolicyen nedenfor, hvor
-- volatile funktioner er tilladt — og hvor de gælder selv ved et direkte
-- API-kald.


-- 1b) Kolonner tilføjet efter første kørsel
-- =========================================
--
-- Kolonner, der kommer til senere, skal stå her OG i create table ovenfor.
-- Grunden er, at tabellen oprettes med "create table if not exists": på en
-- database, hvor filen allerede har været kørt, springes hele blokken over, og
-- en kolonne tilføjet deroppe ville aldrig blive oprettet. Omvendt hører den
-- stadig i tabeldefinitionen, så den kan læses som én helhed.
--
-- Dobbeltføringen er altså bevidst. Begge steder er idempotente, så filen kan
-- køres igen uden at gøre skade.
alter table lokale_bookinger
  add column if not exists hold text;

alter table lokale_bookinger
  add column if not exists serie_id uuid;

-- Navnet er ikke tilfældigt: det er præcis det navn, Postgres selv giver check-
-- reglen på kolonnen i create table ovenfor. På en ny database findes reglen
-- derfor allerede, og blokken springes over frem for at oprette en dublet.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'lokale_bookinger_hold_check'
       and conrelid = 'lokale_bookinger'::regclass
  ) then
    alter table lokale_bookinger
      add constraint lokale_bookinger_hold_check
      check (hold is null or length(btrim(hold)) between 1 and 100);
  end if;
end $$;


-- 2) Dobbeltbooking er fysisk umulig
-- ==================================
--
-- Uden dette kan to samtidige forespørgsler begge bestå en "er tiden fri?"-
-- kontrol i applikationen og begge indsætte. Databasen er det eneste sted,
-- garantien kan holde.
--
-- Reglen er afgrænset pr. lokale, så samme person frit kan have uafhængige
-- bookinger i mødelokalet og cafeteriet på samme tidspunkt.
--
-- WHERE-delen er et bevidst valg: en afventende cafeteria-booking HOLDER
-- tidsrummet. Ellers kunne to personer få hver sin afventende booking på samme
-- tid, og den ene ville uundgåeligt få et afslag efter at have fået håb.
-- Afviste og aflyste bookinger frigiver tiden igen.
-- conrelid er med i tjekket, fordi conname ikke er unik på tværs af tabeller.
-- Uden den ville reglen blive sprunget over, hvis en anden tabel senere fik en
-- constraint med samme navn.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'ingen_dobbeltbooking'
       and conrelid = 'lokale_bookinger'::regclass
  ) then
    alter table lokale_bookinger
      add constraint ingen_dobbeltbooking
      exclude using gist (lokale with =, tidsrum with &&)
      where (status in ('afventer','bekraeftet'));
  end if;
end $$;

create index if not exists lokale_bookinger_opslag
  on lokale_bookinger (lokale, start_tid);

-- Adminfladen slår en hel serie op ad gangen: for at kunne vise hvor mange
-- bookinger den består af, og for at kunne aflyse dem alle på én gang. Delvist
-- indeks, fordi langt de fleste rækker er enkeltbookinger med serie_id null, og
-- de har intet at gøre i indekset.
create index if not exists lokale_bookinger_serie
  on lokale_bookinger (serie_id, start_tid)
  where serie_id is not null;


-- 3) Optagethed uden persondata
-- =============================
--
-- Den offentlige side skal vise hvilke tidsrum der er taget, men må aldrig
-- kunne vise navn, mail eller mobil. Derfor en view med kun de felter, der er
-- nødvendige for at tegne kalenderen.
create or replace view lokale_optagethed as
  select lokale, start_tid, slut_tid, status
    from lokale_bookinger
   where status in ('afventer','bekraeftet');


-- 4) Forsøgstælling til spam-forsvar
-- ==================================
--
-- Kun en saltet hash af IP-adressen gemmes, ikke adressen selv. Formålet er
-- spam-forsvar, ikke sporing, og rækkerne ryddes efter et døgn.
create table if not exists booking_forsoeg (
  ip_hash    text not null,
  tidspunkt  timestamptz not null default now()
);

create index if not exists booking_forsoeg_opslag
  on booking_forsoeg (ip_hash, tidspunkt desc);


-- 4b) updated_at holdes sand
-- ==========================
--
-- Kolonnen har en default ved oprettelse, men uden en trigger ville den blive
-- stående på oprettelsestidspunktet og altså lyve efter enhver opdatering. En
-- tidsstempelkolonne, der ikke er sand, er værre end ingen: den bruges til at
-- vurdere hvornår noget sidst blev rørt, fx når en booking godkendes.
create or replace function saet_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists lokale_bookinger_updated_at on lokale_bookinger;

create trigger lokale_bookinger_updated_at
  before update on lokale_bookinger
  for each row execute function saet_updated_at();


-- 5) Rækkesikkerhed
-- =================

alter table lokale_bookinger enable row level security;
alter table booking_forsoeg  enable row level security;

-- Ingen policies på booking_forsoeg. Tabellen er kun tilgængelig gennem
-- funktionen registrer_bookingforsoeg nedenfor.

drop policy if exists "offentlig oprettelse af bookinger" on lokale_bookinger;

create policy "offentlig oprettelse af bookinger"
  on lokale_bookinger for insert to anon
  with check (
    -- Cafeteria SKAL starte som afventende. Uden dette kunne enhver oprette en
    -- allerede bekræftet cafeteria-booking og dermed omgå godkendelsen helt.
    (
      (lokale = 'cafeteria'   and status = 'afventer')
      or
      (lokale = 'moedelokale' and status = 'bekraeftet')
    )

    -- Felter som kun serverkode må sætte
    and godkend_token_hash is null
    and slet_token_hash    is null
    and besluttet_af       is null
    and besluttet_tid      is null
    and afvisningsgrund    is null

    -- Tidsvindue. Disse to kan ikke være constraints, fordi de bruger now().
    and start_tid >= now()
    and start_tid <= now() + interval '6 months'

    -- Starten skal ligge inden for åbningstiden på sin egen ugedag, i dansk tid.
    -- isodow: 1 = mandag ... 7 = søndag.
    and case
          when extract(isodow from start_tid at time zone 'Europe/Copenhagen') <= 5
            then (start_tid at time zone 'Europe/Copenhagen')::time >= time '14:00'
          else (start_tid at time zone 'Europe/Copenhagen')::time >= time '09:00'
        end

    -- Slutningen må ikke ligge efter kl. 22 på STARTDAGEN.
    --
    -- Bevidst formuleret som en sammenligning af tidsstempler frem for som
    -- (slut_tid ...)::time <= '22:00'. Sidstnævnte har en fælde: en booking der
    -- slutter præcis ved midnat har klokketiden 00:00, som er mindre end 22:00,
    -- og ville derfor bestå. En kontrol af at start og slut ligger på samme dato
    -- fanger den heller ikke, da slut minus et mikrosekund stadig ligger på
    -- startdagen. Formuleringen nedenfor afviser både det og alt, der spænder
    -- over midnat, i én betingelse.
    and (slut_tid at time zone 'Europe/Copenhagen')
        <= ((start_tid at time zone 'Europe/Copenhagen')::date + time '22:00')
  );

-- Ingen select-, update- eller delete-policy for anon. Læsning sker gennem
-- lokale_optagethed, og sletning gennem funktionen slet_egen_booking nedenfor.
-- service_role omgår rækkesikkerhed og bruges kun af adminfladen bag login.

grant select on lokale_optagethed to anon;

-- Den tabelbrede rettighed fjernes FØRST.
--
-- Uden denne linje strammer filen ingenting på en database, hvor den allerede
-- har været kørt: "grant insert (kolonner)" ophæver ikke en tidligere
-- "grant insert on lokale_bookinger" — de to er selvstændige rettigheder, og
-- den brede ville blive stående. Det blev opdaget ved at prøve at indsætte en
-- kolonne uden for listen udefra med anon-nøglen; forsøget lykkedes.
--
-- Revoke på en rettighed, der ikke findes, er et no-op, så filen kan stadig
-- køres på en tom database.
revoke insert on lokale_bookinger from anon;

-- Kolonnebegrænset med vilje. Et almindeligt "grant insert on lokale_bookinger"
-- ville give anon ret til at forsøge at sætte enhver kolonne, og så er policyens
-- WITH CHECK den eneste spærre foran token-felterne. Med to spærrer kan én
-- fremtidig fejl i policyen ikke i sig selv eksponere godkend_token_hash eller
-- slet_token_hash — rettigheden findes simpelthen ikke.
--
-- id er med i listen med vilje. Den offentlige rute kan ikke få bookingens id
-- tilbage efter oprettelsen: "Prefer: return=representation" laver et RETURNING,
-- som udløser en læsekontrol, og anon har ingen select-policy. Ruten genererer
-- derfor selv UUID'et og sender det med, fordi den skal bruge id'et til
-- sletlinket i bekræftelsesmailen. Alternativet ville være at give anon
-- læseadgang, hvilket er langt værre.
--
-- Nye kolonner, som brugeren skal kunne udfylde, skal tilføjes her. Glemmes det,
-- fejler oprettelsen tydeligt frem for at åbne noget.
grant insert (
  id, lokale, start_tid, slut_tid, status,
  formaal, hold, navn, email, mobil, besked
) on lokale_bookinger to anon;


-- 6) Sletning af egen booking
-- ===========================
--
-- Kravet er, at kun den der oprettede bookingen kan slette den, bekræftet ved
-- at indtaste samme e-mail. Det kan IKKE løses med en delete-policy: policyen
-- ser kun rækkens data, ikke hvad brugeren hævder sin mail er. Enhver variant
-- kunne omgås ved blot at sende en anden mail med.
--
-- Derfor en security definer-funktion, hvor sammenligningen sker inde i
-- databasen. Anon har ingen delete-rettighed på tabellen — kun ret til at kalde
-- denne funktion, hvis logik er spærren.
--
-- VIGTIGT om hvad funktionen IKKE beskytter mod. Returværdien afslører, om
-- mailen matchede. Med et kendt booking-id er funktionen derfor et orakel, der
-- kan gætte sig frem til bookerens mailadresse, ét forsøg ad gangen. Selve
-- bookingerne kan ikke opregnes — id'et er et UUID med 122 bits entropi — men
-- har man først et id, kan mailen afsløres.
--
-- Kaldet skal derfor gå gennem registrer_bookingforsoeg, ligesom oprettelse, så
-- gætteforsøg begrænses pr. IP. Det er et krav til den rute, der kalder
-- funktionen, ikke noget funktionen selv kan håndhæve.
create or replace function slet_egen_booking(p_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  fandtes boolean;
begin
  delete from lokale_bookinger
   where id = p_id
     and lower(btrim(email)) = lower(btrim(p_email))
     and start_tid > now();          -- afholdte bookinger kan ikke fjernes
  fandtes := found;
  return fandtes;
end $$;

revoke all on function slet_egen_booking(uuid, text) from public;
grant execute on function slet_egen_booking(uuid, text) to anon;


-- 7) Forsøgstælling pr. IP
-- ========================
--
-- Returnerer true hvis forsøget må fortsætte, false hvis grænsen er nået.
-- Registrerer samtidig forsøget, så kaldet både tæller og spørger.
--
-- Ligger som funktion frem for som policy, fordi rækkesikkerhed ikke kan tælle.
-- Anon kan hverken læse eller skrive booking_forsoeg direkte.
create or replace function registrer_bookingforsoeg(
  p_ip_hash text,
  p_maks    int default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  antal int;
begin
  delete from booking_forsoeg where tidspunkt < now() - interval '24 hours';

  select count(*) into antal
    from booking_forsoeg
   where ip_hash = p_ip_hash
     and tidspunkt > now() - interval '1 hour';

  if antal >= p_maks then
    return false;
  end if;

  insert into booking_forsoeg (ip_hash) values (p_ip_hash);
  return true;
end $$;

revoke all on function registrer_bookingforsoeg(text, int) from public;
grant execute on function registrer_bookingforsoeg(text, int) to anon;


-- Kontrol
-- =======
--
-- Er rækkesikkerhed slået til på begge tabeller?
--   select relname, relrowsecurity from pg_class
--    where relname in ('lokale_bookinger','booking_forsoeg');
--
-- Hvilke policies findes?
--   select tablename, policyname, roles, cmd from pg_policies
--    where tablename in ('lokale_bookinger','booking_forsoeg');
--
-- Findes udelukkelsesreglen?
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'lokale_bookinger'::regclass and contype = 'x';
--
-- Er insert-rettigheden kolonnebegrænset? Der skal stå præcis elleve kolonner,
-- og godkend_token_hash og slet_token_hash må IKKE være blandt dem:
--   select column_name from information_schema.column_privileges
--    where table_name = 'lokale_bookinger' and grantee = 'anon'
--      and privilege_type = 'INSERT' order by column_name;
--
-- Er den tabelbrede rettighed væk? Forespørgslen skal give nul rækker:
--   select privilege_type from information_schema.table_privileges
--    where table_name = 'lokale_bookinger' and grantee = 'anon'
--      and privilege_type = 'INSERT';
--
-- Praktisk prøve udefra med anon-nøglen: et forsøg på at sætte en kolonne uden
-- for listen skal afvises. Fx godkend_token_hash i en ellers gyldig booking.
--
-- Findes serie_id, og er den holdt UDE af anons insert-rettighed? Den første
-- forespørgsel skal give én række, den anden nul:
--   select column_name, data_type from information_schema.columns
--    where table_name = 'lokale_bookinger' and column_name = 'serie_id';
--   select column_name from information_schema.column_privileges
--    where table_name = 'lokale_bookinger' and grantee = 'anon'
--      and privilege_type = 'INSERT' and column_name = 'serie_id';
--
-- Findes hold-kolonnen med sin check-regel, og kun én gang?
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'lokale_bookinger'::regclass
--      and pg_get_constraintdef(oid) ilike '%hold%';
--
-- Opdateres updated_at? Tidsstemplet skal ændre sig:
--   select updated_at from lokale_bookinger where email = 'test@example.com';
--   update lokale_bookinger set formaal = 'Rettet' where email = 'test@example.com';
--   select updated_at from lokale_bookinger where email = 'test@example.com';
--
-- Afvises overlap? Andet kald skal fejle med 23P01 exclusion_violation:
--   insert into lokale_bookinger (lokale,start_tid,slut_tid,status,formaal,navn,email,mobil)
--   values ('moedelokale','2026-09-01 16:00+02','2026-09-01 17:00+02','bekraeftet','Test','Test Tester','test@example.com','12345678');
--   insert into lokale_bookinger (lokale,start_tid,slut_tid,status,formaal,navn,email,mobil)
--   values ('moedelokale','2026-09-01 16:30+02','2026-09-01 17:30+02','bekraeftet','Test 2','Test Tester','test@example.com','12345678');
--   -- ryd op igen:
--   delete from lokale_bookinger where email = 'test@example.com';
