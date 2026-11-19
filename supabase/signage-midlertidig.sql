-- Skærme Alliancen: midlertidig visning.
--
-- Ét element vises alene på en skærm indtil midlertidig_til og afløses så af
-- playlisten igen. Skærmen "cafeteria" styrer også /infoskaerm/cafeteria.
-- Ingen nye tabeller, så de eksisterende grants og policies dækker. Kan køres
-- flere gange.

alter table signage_skaerme add column if not exists midlertidig_element_id uuid
  references signage_elementer (id) on delete set null;
alter table signage_skaerme add column if not exists midlertidig_til timestamptz;
