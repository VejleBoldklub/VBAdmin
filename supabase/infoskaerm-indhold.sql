-- Infoskærm Cafeteria: redigerbart kostindhold pr. farve.
--
-- Indholdet lå tidligere som konstanter i lib/infoskaerm/content.ts. De
-- konstanter bliver stående og bruges som reserve: kan en farve ikke hentes
-- her, viser skærmen den hardcodede udgave frem for ingenting. Skærmen står i
-- et cafeteria uden opsyn, og en tom skærm er værre end et forældet kostråd.
--
-- Dagens navn (Performance, Recovery, Health) ligger som kolonne her, ikke
-- udledt i koden. Da titlen kunne redigeres, kunne de to ellers komme ud af
-- sync — det var netop grunden til, at navnet ikke er en kolonne på ugeplanen.
--
-- Farven på headerens tekst er derimod IKKE en kolonne. Den udregnes ud fra
-- farvekodens lysstyrke, så en lys baggrund altid får mørk tekst. Ellers kunne
-- et skift af farvekoden gøre overskriften ulæselig, uden at den, der ændrede
-- den, opdagede det.

create table if not exists infoskaerm_indhold (
  farve text primary key check (farve in ('Rød', 'Gul', 'Grøn')),
  titel text not null,
  undertitel_da text not null,
  undertitel_en text not null,
  kortnavn text not null,
  farvekode text not null check (farvekode ~ '^#[0-9A-Fa-f]{6}$'),
  lys_farvekode text not null check (lys_farvekode ~ '^#[0-9A-Fa-f]{6}$'),
  blokke jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),

  -- Blokkene skal være en liste af objekter med de fire tekstfelter. Uden
  -- dette kunne en fejl i adminfladen lægge vilkårligt JSON i kolonnen, og
  -- skærmen ville falde tilbage til reserven uden at nogen forstod hvorfor.
  constraint infoskaerm_indhold_blokke_er_liste check (jsonb_typeof(blokke) = 'array')
);

create or replace function infoskaerm_indhold_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists infoskaerm_indhold_set_updated_at on infoskaerm_indhold;
create trigger infoskaerm_indhold_set_updated_at
  before update on infoskaerm_indhold
  for each row execute function infoskaerm_indhold_set_updated_at();

alter table infoskaerm_indhold enable row level security;

-- Den offentlige skærm må kun læse, som på ugeplanen. Skrivning sker
-- udelukkende med service_role fra adminfladen.
drop policy if exists "Public kan læse indhold" on infoskaerm_indhold;
create policy "Public kan læse indhold"
  on infoskaerm_indhold
  for select
  to anon
  using (true);

-- Seed: de værdier, der hidtil stod i DAY_CONTENT.
--
-- on conflict do nothing, ikke do update. Køres filen igen efter at Helene har
-- rettet teksterne, må den ikke sætte dem tilbage til udgangspunktet.
insert into infoskaerm_indhold
  (farve, titel, undertitel_da, undertitel_en, kortnavn, farvekode, lys_farvekode, blokke)
values
  (
    'Rød', 'Rød', 'Performance (MD-1 og MD)', 'Performance (MD-1 and MD)',
    'Performance', '#B91C1C', '#FEE2E2',
    '[
      {"titel_da":"Morgenmad","titel_en":"Breakfast",
       "tekst_da":"Cornflakes/havregryn\nHvidt brød med marmelade/honning\nJuice",
       "tekst_en":"Cornflakes/oats\nWhite bread with jam/honey\nJuice"},
      {"titel_da":"Middag","titel_en":"Lunch",
       "tekst_da":"Hvid pasta/ris\n350 g til alle\nMagert kød: fisk/kylling",
       "tekst_en":"White pasta/rice\n350 g for everyone\nLean meat: fish/chicken"},
      {"titel_da":"Kamp","titel_en":"Match",
       "tekst_da":"Snacks tæt på kamp\nGel 10 min før kickoff\nGel i halvleg\nRecovery-drik efter kamp",
       "tekst_en":"Snacks close to match\nGel 10 min before kickoff\nGel at half-time\nRecovery drink after match"}
    ]'::jsonb
  ),
  (
    'Gul', 'Gul', 'Recovery (MD+1)', 'Recovery (MD+1)',
    'Recovery', '#D6A800', '#FFF7C2',
    '[
      {"titel_da":"Morgenmad","titel_en":"Breakfast",
       "tekst_da":"Æg\nCornflakes og havregryn\nGræsk yoghurt\nBær og tart cherry",
       "tekst_en":"Eggs\nCornflakes and oats\nGreek yoghurt\nBerries and tart cherry"},
      {"titel_da":"Middag","titel_en":"Lunch",
       "tekst_da":"Fisk, kylling, kalkun\nKartofler, majs, ærter, rødbeder, gulerødder\nHvid pasta/ris",
       "tekst_en":"Fish, chicken, turkey\nPotatoes, corn, peas, beetroot, carrots\nWhite pasta/rice"},
      {"titel_da":"Makroer","titel_en":"Macros",
       "tekst_da":"Højt kulhydratindtag\nHøjt proteinindtag\nLavt mættet fedt\nModerat fiberindtag",
       "tekst_en":"High carbohydrate intake\nHigh protein intake\nLow saturated fat\nModerate fibre intake"}
    ]'::jsonb
  ),
  (
    'Grøn', 'Grøn', 'General Health (øvrige dage)', 'General Health (other days)',
    'Health', '#2E8B2E', '#E3F7E3',
    '[
      {"titel_da":"Grundprincip","titel_en":"Main principle",
       "tekst_da":"Halvdelen af tallerkenen grønt\nProtein og fibre\nUmættet fedt\nKomplekse kulhydrater",
       "tekst_en":"Half the plate vegetables\nProtein and fibre\nUnsaturated fat\nComplex carbohydrates"},
      {"titel_da":"Morgenmad","titel_en":"Breakfast",
       "tekst_da":"Æg\nHavregryn\nFrugt\nGræsk yoghurt / skyr med honning",
       "tekst_en":"Eggs\nOats\nFruit\nGreek yoghurt / skyr with honey"},
      {"titel_da":"Middag","titel_en":"Lunch",
       "tekst_da":"Salater i regnbuens farver\nOkse, fisk, kylling\nMørk ris/pasta eller kartofler med skræl",
       "tekst_en":"Colourful salads\nBeef, fish, chicken\nBrown rice/pasta or potatoes with skin"}
    ]'::jsonb
  )
on conflict (farve) do nothing;
