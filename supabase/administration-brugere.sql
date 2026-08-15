-- Administration: brugere, roller og moduladgang.
--
-- Erstatter ADMIN_BASIC_AUTH, som var ét delt kodeord til hele adminfladen.
-- Selve login og adgangskoder ligger i Supabase Auth (auth.users). Denne tabel
-- svarer kun på ét spørgsmål: hvad må den bruger, der er logget ind?
--
-- Rollen 'admin' ignorerer allowed_modules og har adgang til alt, inklusive
-- denne side. Rollen 'user' har adgang til præcis de moduler, der står i
-- allowed_modules.

create table if not exists admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  rolle text not null check (rolle in ('admin', 'user')),

  -- Modulnøglerne kontrolleres i databasen, ikke kun i koden. En tastefejl
  -- ville ellers give en bruger adgang til ingenting, uden at nogen kunne se
  -- hvorfor. Tilføjes et nyt modul, skal listen her udvides.
  allowed_modules text[] not null default '{}'
    check (allowed_modules <@ array['baneplan', 'lokalebooking', 'infoskaerm']::text[]),

  oprettet timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 'administration' er bevidst ikke en modulnøgle. Adgang til brugerstyringen
-- følger rollen 'admin'. Var det et modul, kunne en bruger få adgang til at
-- give sig selv adgang til resten.

create or replace function admin_users_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists admin_users_set_updated_at on admin_users;
create trigger admin_users_set_updated_at
  before update on admin_users
  for each row execute function admin_users_set_updated_at();

alter table admin_users enable row level security;

-- Ingen policies, med vilje.
--
-- Rækkesikkerhed uden policies lukker for alle almindelige roller, herunder
-- anon og authenticated. service_role omgår rækkesikkerhed og er dermed den
-- eneste vej ind — og den nøgle findes kun i vores egen serverkode.
--
-- Det betyder også, at en indlogget bruger IKKE kan læse sin egen række direkte
-- fra browseren med anon-nøglen. Det er hensigten: rolle og moduladgang slås op
-- i vores serverkode, så en bruger ikke kan spørge databasen om noget, vi ikke
-- har besluttet at fortælle.

-- ---------------------------------------------------------------------------
-- Migrering af den nuværende adgang
--
-- Kør DETTE afsnit, før den nye proxy.ts deployes. Basic Auth holder op med at
-- virke i samme øjeblik, koden er ude, og uden en række her er adminfladen
-- lukket for alle — også for den, der skulle rette op på det.
--
-- Brugeren skal først findes i Supabase Auth. Opret den under
-- Authentication → Users → Add user med adressen nedenfor, og sæt en
-- adgangskode. Derefter kobler denne indsætning rollen på.
-- ---------------------------------------------------------------------------

do $$
declare
  bruger_id uuid;
  adresse text := 'kim.schwartz@vejleboldklub.dk';
begin
  select id into bruger_id from auth.users where email = adresse;

  if bruger_id is null then
    raise exception
      'Brugeren % findes ikke i Supabase Auth. Opret den under Authentication → Users, og kør så denne fil igen.',
      adresse;
  end if;

  insert into admin_users (auth_user_id, email, rolle, allowed_modules)
  values (bruger_id, adresse, 'admin', '{}')
  on conflict (auth_user_id) do update set rolle = 'admin', email = excluded.email;
end $$;
