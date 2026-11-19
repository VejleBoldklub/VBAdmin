-- Infoskærm Cafeteria: egne dagtyper (fx "Rød 2") ud over Rød, Gul og Grøn.
--
-- En dagtype er en række i infoskaerm_indhold. Den faste liste i
-- check-constraints fjernes og erstattes af fremmednøgler, så ugeplanen og
-- designs kun kan pege på typer, der findes. "on update cascade" lader en
-- omdøbning følge med; ugeplanen må ikke miste en type, der er i brug
-- (restrict), mens et design går med, når typen slettes (cascade).
--
-- Ingen nye tabeller, så ingen nye grants. Kan køres flere gange.

-- Forudsætter, at supabase/infoskaerm-indhold.sql er kørt, så Rød, Gul og Grøn
-- findes som rækker. Ellers fejler fremmednøglerne nedenfor.

alter table infoskaerm_indhold drop constraint if exists infoskaerm_indhold_farve_check;
alter table infoskaerm_indhold drop constraint if exists infoskaerm_indhold_farve_navn;
alter table infoskaerm_indhold
  add constraint infoskaerm_indhold_farve_navn check (char_length(btrim(farve)) between 1 and 30);

alter table infoskaerm_indhold add column if not exists raekkefoelge int not null default 100;
update infoskaerm_indhold set raekkefoelge = 0 where farve = 'Rød';
update infoskaerm_indhold set raekkefoelge = 1 where farve = 'Gul';
update infoskaerm_indhold set raekkefoelge = 2 where farve = 'Grøn';

alter table infoskaerm_ugeplan drop constraint if exists infoskaerm_ugeplan_farve_check;
alter table infoskaerm_ugeplan drop constraint if exists infoskaerm_ugeplan_farve_fkey;
alter table infoskaerm_ugeplan
  add constraint infoskaerm_ugeplan_farve_fkey foreign key (farve)
  references infoskaerm_indhold (farve) on update cascade on delete restrict;

alter table infoskaerm_design drop constraint if exists infoskaerm_design_farve_check;
alter table infoskaerm_design drop constraint if exists infoskaerm_design_farve_fkey;
alter table infoskaerm_design
  add constraint infoskaerm_design_farve_fkey foreign key (farve)
  references infoskaerm_indhold (farve) on update cascade on delete cascade;
