-- Infoskærm Cafeteria: opsætningen "Kun billeder".
--
-- Skærmen kan nu vise billederne alene, i fuld skærm efter tur, uden
-- kostplanen. Tjekket på kolonnen layout udvides med værdien 'billeder'.
--
-- Filen kan køres flere gange.

alter table infoskaerm_opsaetning
  drop constraint if exists infoskaerm_opsaetning_layout_check;

alter table infoskaerm_opsaetning
  add constraint infoskaerm_opsaetning_layout_check
  check (layout in ('kost', 'side', 'skift', 'billeder'));
