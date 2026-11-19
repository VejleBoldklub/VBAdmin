-- Signage: klubbens skærme, hver med sin egen playliste.
--
--   signage_skaerme    én række pr. fysisk skærm. Player-URL'en er
--                      /signage/<slug>, og skærmens indstillinger ligger her.
--   signage_medier     mediebiblioteket: billeder og videoer, lagt op én gang
--                      og brugt på så mange skærme, man vil.
--   signage_elementer  playlisterne. Hvert element hører til én skærm, har sin
--                      plads i rækkefølgen, sin varighed og sin egen plan for,
--                      hvornår det må vises.
--
-- Filerne ligger i Supabase Storage i bucketen 'signage'.
--
-- Filen kan køres flere gange uden at overskrive noget, der er rettet siden.

-- ---------------------------------------------------------------------------
-- Modulnøglen
-- ---------------------------------------------------------------------------

-- 'signage' skal kunne gives til en bruger, der ikke er administrator.
alter table admin_users drop constraint if exists admin_users_allowed_modules_check;
alter table admin_users add constraint admin_users_allowed_modules_check
  check (allowed_modules <@ array['baneplan', 'lokalebooking', 'infoskaerm', 'signage']::text[]);

-- ---------------------------------------------------------------------------
-- Filerne
-- ---------------------------------------------------------------------------

-- Offentlig til læsning: skærmene har ingen at logge ind. Der oprettes ingen
-- policies på storage.objects, så kun service_role kan lægge op og slette.
-- Upload sker fra browseren med en signeret upload-URL, som adminfladen kun
-- udsteder efter at have kontrolleret adgangen.
--
-- 500 MB pr. fil giver plads til en længere video i god kvalitet. Supabase'
-- eget projektloft for filstørrelse kan være lavere — se adminfladen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signage',
  'signage',
  true,
  524288000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Fælles: updated_at
-- ---------------------------------------------------------------------------

create or replace function signage_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Skærmene
-- ---------------------------------------------------------------------------

create table if not exists signage_skaerme (
  id uuid primary key default gen_random_uuid(),
  navn text not null check (char_length(btrim(navn)) between 1 and 80),

  -- Adressen: /signage/<slug>. Kun små bogstaver, tal og bindestreg, så den
  -- kan skrives ind på en skærm uden at blive misforstået.
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$'),

  placering text not null default '' check (char_length(placering) <= 120),

  -- Slået fra viser skærmen en sort flade frem for playlisten.
  aktiv boolean not null default true,

  -- Hvordan billeder og videoer fylder skærmen, når elementet ikke selv siger
  -- andet: 'contain' viser hele billedet, 'cover' fylder hele skærmen.
  tilpasning text not null default 'contain' check (tilpasning in ('contain', 'cover')),
  overgang text not null default 'fade' check (overgang in ('ingen', 'fade', 'slide')),
  overgang_ms integer not null default 600 check (overgang_ms between 0 and 3000),
  baggrund text not null default '#000000' check (baggrund ~ '^#[0-9a-fA-F]{6}$'),

  -- Hvor længe et element står, hvis det ikke selv har en varighed.
  standard_sekunder integer not null default 10 check (standard_sekunder between 3 and 3600),

  -- Lyd på videoer. Browsere tillader kun lyd uden klik, hvis kiosken er sat
  -- op til det; ellers falder playeren selv tilbage til uden lyd.
  lyd boolean not null default false,

  -- Hvor ofte skærmen henter playlisten igen.
  opdater_sekunder integer not null default 60 check (opdater_sekunder between 15 and 3600),

  -- Ur og dato i et hjørne, eller ikke.
  vis_ur boolean not null default false,

  -- Hvis skærmen har en fast åbningstid, er den sort udenfor. Begge null
  -- betyder døgnet rundt.
  taend_fra time,
  taend_til time,

  -- Sat af skærmen selv, hver gang den henter playlisten. Viser i adminfladen,
  -- om skærmen er i live.
  sidst_set timestamptz,

  oprettet timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists signage_skaerme_set_updated_at on signage_skaerme;
create trigger signage_skaerme_set_updated_at
  before update on signage_skaerme
  for each row execute function signage_set_updated_at();

alter table signage_skaerme enable row level security;

drop policy if exists "Public kan læse skærme" on signage_skaerme;
create policy "Public kan læse skærme"
  on signage_skaerme for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Mediebiblioteket
-- ---------------------------------------------------------------------------

create table if not exists signage_medier (
  id uuid primary key default gen_random_uuid(),
  navn text not null check (char_length(btrim(navn)) between 1 and 160),
  type text not null check (type in ('billede', 'video')),

  -- Stien i bucketen 'signage'. Unik, så to rækker ikke deler en fil.
  sti text not null unique,
  mime text not null,
  bytes bigint not null default 0,

  oprettet timestamptz not null default now()
);

alter table signage_medier enable row level security;

drop policy if exists "Public kan læse medier" on signage_medier;
create policy "Public kan læse medier"
  on signage_medier for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Playlisterne
-- ---------------------------------------------------------------------------

create table if not exists signage_elementer (
  id uuid primary key default gen_random_uuid(),

  -- Slettes skærmen, går dens playliste med.
  skaerm_id uuid not null references signage_skaerme(id) on delete cascade,

  --   billede     et billede fra mediebiblioteket
  --   video       en video fra mediebiblioteket
  --   tekst       et slide med overskrift og tekst, evt. med et billede bag
  --   web         en webside i fuld skærm (skal tillade at blive vist i iframe)
  --   infoskaerm  cafeteriets infoskærm, som den ser ud lige nu
  type text not null check (type in ('billede', 'video', 'tekst', 'web', 'infoskaerm')),

  -- Et medie i brug kan ikke slettes fra biblioteket. Det ville give et hul i
  -- en playliste, som ingen opdagede, før skærmen var sort.
  medie_id uuid references signage_medier(id) on delete restrict,

  titel text not null default '' check (char_length(titel) <= 200),
  tekst text not null default '' check (char_length(tekst) <= 2000),
  url text not null default '' check (url = '' or url ~ '^https://'),

  -- Null betyder skærmens standard. 0 på en video betyder "hele videoen".
  sekunder integer check (sekunder is null or sekunder between 0 and 3600),

  -- Null betyder skærmens standard.
  tilpasning text check (tilpasning is null or tilpasning in ('contain', 'cover')),

  baggrund text not null default '#b91c1c' check (baggrund ~ '^#[0-9a-fA-F]{6}$'),
  tekstfarve text not null default '#ffffff' check (tekstfarve ~ '^#[0-9a-fA-F]{6}$'),
  justering text not null default 'center' check (justering in ('venstre', 'center')),

  raekkefoelge integer not null default 0,
  aktiv boolean not null default true,

  -- Planlægning. Alt er valgfrit, og alt skal passe, før elementet vises.
  -- Tiderne er danske. fra_tid > til_tid betyder hen over midnat.
  fra_dato date,
  til_dato date,
  ugedage smallint[] not null default '{1,2,3,4,5,6,7}'
    check (ugedage <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(ugedage) >= 1),
  fra_tid time,
  til_tid time,

  oprettet timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint signage_elementer_medie_krav check (
    (type in ('billede', 'video') and medie_id is not null)
    or (type not in ('billede', 'video'))
  ),
  constraint signage_elementer_web_krav check (type <> 'web' or url <> ''),
  constraint signage_elementer_datoer check (fra_dato is null or til_dato is null or fra_dato <= til_dato)
);

create index if not exists signage_elementer_skaerm on signage_elementer (skaerm_id, raekkefoelge);
create index if not exists signage_elementer_medie on signage_elementer (medie_id);

drop trigger if exists signage_elementer_set_updated_at on signage_elementer;
create trigger signage_elementer_set_updated_at
  before update on signage_elementer
  for each row execute function signage_set_updated_at();

alter table signage_elementer enable row level security;

drop policy if exists "Public kan læse aktive elementer" on signage_elementer;
create policy "Public kan læse aktive elementer"
  on signage_elementer for select to anon, authenticated
  using (aktiv);

-- ---------------------------------------------------------------------------
-- Rettigheder til Data API'et
-- ---------------------------------------------------------------------------

-- Nye tabeller får ikke længere rettigheder af sig selv. Adminfladen skriver
-- med service_role; skærmene læser med anon bag policies ovenfor.
grant select, insert, update, delete on public.signage_skaerme to service_role;
grant select, insert, update, delete on public.signage_medier to service_role;
grant select, insert, update, delete on public.signage_elementer to service_role;

grant select on public.signage_skaerme to anon, authenticated;
grant select on public.signage_medier to anon, authenticated;
grant select on public.signage_elementer to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Første skærm: cafeteriet
-- ---------------------------------------------------------------------------

-- Cafeteriets infoskærm oprettes som skærm med infoskærmen som eneste element,
-- så den kan styres herfra med det samme. Den eksisterende adresse
-- /infoskaerm/cafeteria virker fortsat uændret.
insert into signage_skaerme (navn, slug, placering)
values ('Cafeteria Infoskærm', 'cafeteria', 'Cafeteria')
on conflict (slug) do nothing;

insert into signage_elementer (skaerm_id, type, titel, raekkefoelge)
select s.id, 'infoskaerm', 'Infoskærm Cafeteria', 0
from signage_skaerme s
where s.slug = 'cafeteria'
  and not exists (select 1 from signage_elementer e where e.skaerm_id = s.id);
