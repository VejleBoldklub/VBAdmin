-- Lokalebooking: automatisk oprydning
-- ===================================
--
-- Kør i Supabase → SQL Editor. Kan køres igen; jobbene erstattes.
--
-- Adskilt fra lokalebooking-skema.sql, fordi pg_cron kræver en udvidelse, der
-- måske skal slås til på projektet først, og fordi skemaet skal kunne køres
-- uden at planlægge noget.

create extension if not exists pg_cron;

-- 1) Bookinger slettes en måned efter de er afholdt
-- =================================================
--
-- Det er både kravet og det rigtige for personoplysningerne: navn, mail og
-- mobil forsvinder af sig selv frem for at ophobes. Uden dette ville
-- kontaktoplysninger ligge i databasen på ubestemt tid.
select cron.unschedule('ryd-gamle-bookinger')
 where exists (select 1 from cron.job where jobname = 'ryd-gamle-bookinger');

select cron.schedule(
  'ryd-gamle-bookinger',
  '15 3 * * *',                       -- hver nat kl. 03.15
  $$ delete from lokale_bookinger where slut_tid < now() - interval '1 month' $$
);

-- 2) Forsøgstælling ryddes hver time
-- ==================================
--
-- Grænsen ser kun en time tilbage, så ældre rækker har ingen funktion. De
-- indeholder en saltet hash af en IP-adresse og skal derfor ikke ligge længere
-- end nødvendigt.
select cron.unschedule('ryd-bookingforsoeg')
 where exists (select 1 from cron.job where jobname = 'ryd-bookingforsoeg');

select cron.schedule(
  'ryd-bookingforsoeg',
  '5 * * * *',                        -- hver time, 5 minutter over
  $$ delete from booking_forsoeg where tidspunkt < now() - interval '24 hours' $$
);


-- Kontrol
-- =======
--   select jobname, schedule, active from cron.job
--    where jobname in ('ryd-gamle-bookinger','ryd-bookingforsoeg');
--
-- Seneste kørsler:
--   select jobname, status, start_time, return_message
--     from cron.job_run_details
--    order by start_time desc limit 10;
--
-- Bemærk: virker pg_cron ikke på projektet, kan de to sætninger i stedet køres
-- fra en Vercel Cron mod en route handler. Oprydningen er ikke kritisk for
-- driften, men den er en forudsætning for at overholde det aftalte om at
-- bookinger ryddes efter en måned.
