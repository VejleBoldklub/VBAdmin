-- Administration: navn på brugere.
--
-- Nullable med vilje. De brugere, der allerede findes, er oprettet uden navn,
-- og de skal ikke spærres eller have et pladsholdernavn på sig. Brugerlisten
-- viser adressen alene, indtil nogen skriver et navn.
--
-- Navnet er visning, ikke identitet. Adgangen hænger fortsat på auth_user_id, og
-- e-mailadressen er stadig den entydige nøgle udadtil. To brugere må gerne hedde
-- det samme.
--
-- Navnet gemmes kun her, ikke også i Supabase Auths user_metadata. To steder
-- ville skulle holdes i takt, og user_metadata kan brugeren selv ændre — så
-- ville listen i adminfladen kunne komme til at vise noget andet end det, en
-- administrator har skrevet.

alter table admin_users add column if not exists navn text;

-- Tomme strenge er ikke et navn. Uden dette ville et blankt felt gemme "" og
-- gøre visningen afhængig af at kunne skelne "" fra null hvert sted.
alter table admin_users drop constraint if exists admin_users_navn_ikke_tom;
alter table admin_users add constraint admin_users_navn_ikke_tom
  check (navn is null or length(btrim(navn)) > 0);
