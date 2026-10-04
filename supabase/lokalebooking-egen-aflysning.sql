-- Lokalebooking: bookerens egen annullering fra kalenderen.
--
-- Kør filen i Supabase → SQL Editor FØR koden, der bruger den, går i produktion.
-- Adminlisten og godkendelsessiderne læser aflysningsgrund, og uden kolonnen
-- fejler de opslag. Filen er idempotent og kan køres igen. De samme ændringer
-- står også i lokalebooking-skema.sql, så en ny database får dem derfra.
--
-- Den, der har booket, kan annullere sin egen kommende booking ved at klikke på
-- den i kalenderen og indtaste den mailadresse, bookingen blev lavet med. For
-- cafeteriet kræves en begrundelse, som sendes til cafeteria@vejleboldklub.dk.
--
-- Annulleringen udføres af serverkoden med service_role, ikke af anon. Den sætter
-- status 'aflyst' — som når klubben annullerer — så sporet bliver stående i
-- adminlisten.

-- Hvem, der aflyste. 'booker' er den nye værdi: uden den kunne adminlisten ikke
-- skelne mellem en booking, klubben tog tilbage, og en, bookeren selv opgav.
alter table lokale_bookinger
  drop constraint if exists lokale_bookinger_besluttet_af_check;
alter table lokale_bookinger
  add constraint lokale_bookinger_besluttet_af_check
  check (besluttet_af in ('mail','admin','booker'));

-- Bookerens begrundelse for at aflyse. Egen kolonne frem for afvisningsgrund:
-- den hører til et afslag fra klubben, og blandes de to, kan det bagefter ikke
-- læses, hvem der skrev hvad.
alter table lokale_bookinger
  add column if not exists aflysningsgrund text;

alter table lokale_bookinger
  drop constraint if exists lokale_bookinger_aflysningsgrund_check;
alter table lokale_bookinger
  add constraint lokale_bookinger_aflysningsgrund_check
  check (aflysningsgrund is null or length(aflysningsgrund) <= 500);

-- Booking-id'et står nu i den offentlige kalender, fordi en blok skal kunne
-- annulleres. slet_egen_booking ville med et kendt id være et orakel, der kan
-- gætte sig frem til bookerens mailadresse direkte mod API'et, uden om
-- forsøgstællingen. Funktionen bruges ikke af appen, så anon mister retten til
-- at kalde den.
revoke execute on function slet_egen_booking(uuid, text) from anon;
