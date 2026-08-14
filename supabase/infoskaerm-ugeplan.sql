-- Infoskærm Cafeteria: ugeplan (dato -> farve + evt. ekstra besked)
-- Erstatter det gamle Google Sheet "Styrepanel - Cafeteria Infoskærm".
--
-- "Navn på dagen" gemmes bevidst IKKE som kolonne - det er 100% afledt af
-- farven (Rød -> Performance, Gul -> Recovery, Grøn -> Health) og udregnes
-- i applikationskoden, så det aldrig kan komme ud af sync med farven.

create table if not exists infoskaerm_ugeplan (
  id uuid primary key default gen_random_uuid(),
  dato date not null unique,
  farve text not null check (farve in ('Rød', 'Gul', 'Grøn')),
  ekstra_besked text not null default '',
  updated_at timestamptz not null default now()
);

-- Der er med vilje ikke et separat indeks på dato. "unique" på kolonnen laver
-- allerede et, og begge opslag i modulet — dagens dato og de kommende 14 dage —
-- bruger det.

-- Hold updated_at frisk ved hver ændring
create or replace function infoskaerm_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists infoskaerm_ugeplan_set_updated_at on infoskaerm_ugeplan;
create trigger infoskaerm_ugeplan_set_updated_at
  before update on infoskaerm_ugeplan
  for each row execute function infoskaerm_set_updated_at();

alter table infoskaerm_ugeplan enable row level security;

-- Den offentlige skærm må kun LÆSE - samme mønster som baneplan_versioner
-- (anon key, RLS-begrænset). Ingen skriveadgang for anon.
drop policy if exists "Public kan læse ugeplan" on infoskaerm_ugeplan;
create policy "Public kan læse ugeplan"
  on infoskaerm_ugeplan
  for select
  to anon
  using (true);

-- Skrivning sker udelukkende via service-role klienten fra admin-siden
-- (samme mønster som resten af VBAdmin - ingen separat "authenticated" rolle
-- endnu, det kobles på når login/rolle-systemet er på plads).
