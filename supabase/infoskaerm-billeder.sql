-- Infoskærm Cafeteria: billeder og skærmens opsætning.
--
-- To ting, som Akademiet selv skal kunne styre fra adminfladen:
--
--   infoskaerm_billeder    billeder af maden m.m., som vises på skærmen
--   infoskaerm_opsaetning  hvordan skærmen er sat op: kun kostplan, kostplan
--                          med billeder ved siden af, eller skift mellem de to
--
-- Selve billedfilerne ligger i Supabase Storage i bucketen 'infoskaerm'.
-- Rækken i infoskaerm_billeder peger på filen med sin sti.
--
-- Filen kan køres flere gange uden at overskrive noget, der er rettet siden.

-- ---------------------------------------------------------------------------
-- Billedfilerne
-- ---------------------------------------------------------------------------

-- Bucketen er offentlig: kiosken har ingen at logge ind, og billederne er lavet
-- til at hænge på en væg i et cafeteria. Offentlig gælder kun læsning. Der
-- oprettes ingen policies på storage.objects, så anon og authenticated kan
-- hverken lægge filer op eller slette dem — det sker udelukkende med
-- service_role fra adminfladen, efter at handlingen har tjekket adgangen.
--
-- Grænsen på 5 MB er et loft for en fejl, ikke en forventning. Adminfladen
-- skalerer billedet ned i browseren, før det sendes, så en fil er normalt under
-- 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'infoskaerm',
  'infoskaerm',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Billederne
-- ---------------------------------------------------------------------------

create table if not exists infoskaerm_billeder (
  id uuid primary key default gen_random_uuid(),

  -- Stien i bucketen 'infoskaerm'. Unik, så to rækker ikke kan dele en fil, og
  -- sletningen af den ene dermed tage billedet fra den anden.
  sti text not null unique,

  -- Valgfri tekst under billedet, fx dagens ret.
  tekst text not null default '' check (char_length(tekst) <= 200),

  -- Null betyder, at billedet vises hver dag. En dato betyder, at det kun
  -- vises den dag — "dagens ret" skal ikke hænge der i morgen.
  vis_dato date,

  -- Skjult er ikke slettet. Et billede, der skal bruges igen næste uge, kan slås
  -- fra uden at blive lagt op på ny.
  aktiv boolean not null default true,

  raekkefoelge integer not null default 0,
  oprettet timestamptz not null default now()
);

alter table infoskaerm_billeder enable row level security;

-- Skærmen må kun læse, og kun de aktive. Skjulte billeder er ikke hemmelige,
-- men der er ingen grund til at sende dem med til kiosken.
drop policy if exists "Public kan læse aktive billeder" on infoskaerm_billeder;
create policy "Public kan læse aktive billeder"
  on infoskaerm_billeder
  for select
  to anon
  using (aktiv);

-- ---------------------------------------------------------------------------
-- Opsætningen
-- ---------------------------------------------------------------------------

-- Én række. id er låst til true, så der ikke kan opstå to opsætninger, som
-- skærmen skulle vælge imellem.
create table if not exists infoskaerm_opsaetning (
  id boolean primary key default true check (id),

  --   kost   kun kostplanen, som skærmen hidtil har set ud
  --   side   kostplanen med billederne i en kolonne ved siden af
  --   skift  skærmen skifter mellem kostplanen og billederne i fuld skærm
  layout text not null default 'kost' check (layout in ('kost', 'side', 'skift')),

  -- Hvor længe hvert billede (og kostplanen, i layoutet 'skift') står, før der
  -- skiftes. Under 5 sekunder kan ingen nå at læse noget; over 5 minutter er der
  -- reelt ikke tale om at skifte.
  sekunder integer not null default 15 check (sekunder between 5 and 300),

  updated_at timestamptz not null default now()
);

create or replace function infoskaerm_opsaetning_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists infoskaerm_opsaetning_set_updated_at on infoskaerm_opsaetning;
create trigger infoskaerm_opsaetning_set_updated_at
  before update on infoskaerm_opsaetning
  for each row execute function infoskaerm_opsaetning_set_updated_at();

alter table infoskaerm_opsaetning enable row level security;

drop policy if exists "Public kan læse opsætning" on infoskaerm_opsaetning;
create policy "Public kan læse opsætning"
  on infoskaerm_opsaetning
  for select
  to anon
  using (true);

-- Skærmen ser ud som hidtil, indtil nogen vælger andet.
insert into infoskaerm_opsaetning (id) values (true)
on conflict (id) do nothing;
