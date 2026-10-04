-- Infoskærm Cafeteria: frit design af skærmen, ét pr. farve.
--
-- Designet laves i editoren under Infoskærm → Design. Det gemmes som en
-- baggrundsfarve og en liste af elementer (tekst, billeder og felter) med
-- position og størrelse på et lærred på 1920 × 1080. Formatet står i
-- lib/infoskaerm/design.ts, og serverhandlingen, der gemmer, renser hvert
-- element efter det, før det skrives her.
--
-- Et design vises kun, når aktiv er sat. Indtil da viser skærmen kostkortene
-- fra infoskaerm_indhold, som den altid har gjort — så et halvfærdigt design
-- kan gemmes uden at komme på væggen.
--
-- Billederne i et design ligger i Storage-bucketen 'infoskaerm' under
-- design/. Bucketen oprettes i supabase/infoskaerm-billeder.sql, som derfor
-- skal være kørt først.

create table if not exists infoskaerm_design (
  farve text primary key check (farve in ('Rød', 'Gul', 'Grøn')),
  baggrund text not null default '#F4F6FB' check (baggrund ~ '^#[0-9A-Fa-f]{6}$'),
  elementer jsonb not null default '[]'::jsonb,
  aktiv boolean not null default false,
  updated_at timestamptz not null default now(),

  constraint infoskaerm_design_elementer_er_liste check (jsonb_typeof(elementer) = 'array')
);

create or replace function infoskaerm_design_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists infoskaerm_design_set_updated_at on infoskaerm_design;
create trigger infoskaerm_design_set_updated_at
  before update on infoskaerm_design
  for each row execute function infoskaerm_design_set_updated_at();

alter table infoskaerm_design enable row level security;

-- Skærmen må kun læse de designs, der er slået til. Skrivning sker
-- udelukkende med service_role fra adminfladen.
drop policy if exists "Public kan læse aktive designs" on infoskaerm_design;
create policy "Public kan læse aktive designs"
  on infoskaerm_design
  for select
  to anon
  using (aktiv);
