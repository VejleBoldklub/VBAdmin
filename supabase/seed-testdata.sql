-- Testdata til visuel afprøvning af ScheduleView
-- ================================================
--
-- Formål: oprette én kladde ("sandkasse") med test-baner og test-tildelinger,
-- så ScheduleView kan afprøves visuelt uden at røre den offentlige live-plan.
--
-- Sådan bruges den:
--   1. Åbn Supabase → SQL Editor for VBAdmin-projektet.
--   2. Kør hele denne fil.
--   3. Åbn /admin/baneplan/efteraar-foraar i VBAdmin.
--      Kladde-editoren vises automatisk, fordi hentKladde() i
--      features/baneplan/actions.ts henter nyeste række med status = 'draft'.
--
-- Sikkerhed:
--   Rækken indsættes med status = 'draft'. En kladde påvirker aldrig den
--   offentlige plan, før den aktivt publiceres (SYSTEM.md §6). Scriptet rører
--   ikke rækker med status 'live' eller 'archived'.
--
-- Oprydning bagefter — enten "Kasser kladde" i brugerfladen, eller:
--   delete from baneplan_versioner
--    where status = 'draft'
--      and plan_slug = 'efteraar-foraar'
--      and saesontitel = 'TESTDATA - Efterår / Forår';

-- Fjern en eventuel tidligere kørsel af dette script, så der ikke ophobes
-- test-kladder. Rører kun kladder oprettet af dette script.
delete from baneplan_versioner
 where status = 'draft'
   and plan_slug = 'efteraar-foraar'
   and saesontitel = 'TESTDATA - Efterår / Forår';

insert into baneplan_versioner (plan_slug, saesontitel, status, data)
values (
  'efteraar-foraar',
  'TESTDATA - Efterår / Forår',
  'draft',
  $json$
{
  "fields": [
    { "name": "Bane 2",     "type": "Kunst" },
    { "name": "Bane 3",     "type": "Kunst" },
    { "name": "Bane 6",     "type": "" },
    { "name": "Bane 10/11", "type": "" }
  ],
  "events": [
    { "id": "t01", "day": "Mandag",  "team": "U7 Piger",                  "start": 990,  "end": 1050, "field": "Bane 2",     "room": "-",  "category": "piger" },
    { "id": "t02", "day": "Mandag",  "team": "U17 Piger",                 "start": 1050, "end": 1140, "field": "Bane 2",     "room": "6",  "category": "piger" },
    { "id": "t03", "day": "Mandag",  "team": "Akademi - individuel",      "start": 1140, "end": 1215, "field": "Bane 2",     "room": "10", "category": "akademi" },
    { "id": "t04", "day": "Mandag",  "team": "U13 Drenge Liga 1",         "start": 960,  "end": 1065, "field": "Bane 3",     "room": "1",  "category": "drenge" },
    { "id": "t05", "day": "Mandag",  "team": "Reserveret kamp",           "start": 1065, "end": 1245, "field": "Bane 3",     "room": "-",  "category": "reserveret" },
    { "id": "t06", "day": "Mandag",  "team": "Future Vejle",              "start": 840,  "end": 960,  "field": "Bane 6",     "room": "3",  "category": "future" },
    { "id": "t07", "day": "Mandag",  "team": "U19 Drenge Ligaen",         "start": 1140, "end": 1260, "field": "Bane 6",     "room": "2",  "category": "drenge" },
    { "id": "t08", "day": "Mandag",  "team": "U8 Piger",                  "start": 1005, "end": 1080, "field": "Bane 10/11", "room": "-",  "category": "piger" },
    { "id": "t09", "day": "Mandag",  "team": "U9 Piger",                  "start": 1005, "end": 1080, "field": "Bane 10/11", "room": "-",  "category": "piger" },

    { "id": "t10", "day": "Tirsdag", "team": "Future Vejle",              "start": 900,  "end": 1020, "field": "Bane 2",     "room": "-",  "category": "future" },
    { "id": "t11", "day": "Tirsdag", "team": "U12 Piger",                 "start": 1020, "end": 1110, "field": "Bane 3",     "room": "4",  "category": "piger" },
    { "id": "t12", "day": "Tirsdag", "team": "U14 Piger",                 "start": 1035, "end": 1125, "field": "Bane 3",     "room": "5",  "category": "piger" },
    { "id": "t13", "day": "Tirsdag", "team": "U15 Drenge Ligaen",         "start": 1050, "end": 1140, "field": "Bane 3",     "room": "8",  "category": "drenge" },
    { "id": "t14", "day": "Tirsdag", "team": "U17 Drenge Ligaen",         "start": 1170, "end": 1260, "field": "Bane 10/11", "room": "12", "category": "drenge" },

    { "id": "t15", "day": "Onsdag",  "team": "U14 Drenge Liga 1",         "start": 1140, "end": 1290, "field": "Bane 2",     "room": "1",  "category": "drenge" },
    { "id": "t16", "day": "Onsdag",  "team": "Reserveret - vedligehold",  "start": 870,  "end": 1050, "field": "Bane 6",     "room": "-",  "category": "reserveret" },
    { "id": "t17", "day": "Onsdag",  "team": "U9 Piger",                  "start": 990,  "end": 1065, "field": "Bane 10/11", "room": "2",  "category": "piger" },

    { "id": "t18", "day": "Lørdag",  "team": "U8 Piger",                  "start": 540,  "end": 630,  "field": "Bane 2",     "room": "1",  "category": "piger" },
    { "id": "t19", "day": "Lørdag",  "team": "U9 Piger",                  "start": 630,  "end": 720,  "field": "Bane 2",     "room": "1",  "category": "piger" },
    { "id": "t20", "day": "Lørdag",  "team": "Reserveret kamp",           "start": 600,  "end": 780,  "field": "Bane 3",     "room": "-",  "category": "reserveret" },
    { "id": "t21", "day": "Lørdag",  "team": "Future Vejle",              "start": 690,  "end": 840,  "field": "Bane 10/11", "room": "3",  "category": "future" },

    { "id": "t22", "day": "Søndag",  "team": "Akademi - individuel",      "start": 570,  "end": 660,  "field": "Bane 2",     "room": "-",  "category": "akademi" }
  ]
}
  $json$::jsonb
);

-- Hvad testdataene dækker
-- =======================
--
-- Kategorier (alle fem farvekoder i categoryClass() i schedule-view.tsx):
--   piger       grøn      t01, t02, t08, t09, t11, t12, t17, t18, t19
--   drenge      ravgul    t04, t07, t13, t14, t15
--   akademi     lyseblå   t03, t22
--   future      blå       t06, t10, t21
--   reserveret  skraveret t05, t16, t20
--
-- Dage som faner: Mandag, Tirsdag, Onsdag, Lørdag, Søndag.
--   Hverdage bruger tidsgitteret 14.30-21.00, weekend 09.00-14.00
--   (rangeForDay() i features/baneplan/layout.ts).
--
-- Overlap og kolonneopdeling i layoutEvents() i features/baneplan/layout.ts:
--   t08 + t09  to samtidige tildelinger på Bane 10/11 mandag   -> 2 kolonner
--   t11+t12+t13 tre overlappende på Bane 3 tirsdag             -> 3 kolonner
--
-- Beskæring mod gitterets kanter:
--   t06 starter 14.00, dvs. før hverdagsgitterets 14.30        -> beskæres foroven
--   t15 slutter 21.30, dvs. efter hverdagsgitterets 21.00      -> beskæres forneden
--   t21 slutter præcis 14.00, weekendgitterets slut            -> kant uden beskæring
--
-- Omklædningsrum og "Ledige omkl.":
--   ALL_ROOMS er 1,2,3,4,5,6,8,10,12 (features/baneplan/layout.ts).
--   Rum 7 og 9 er permanent låst til U19 Drenge Ligaen hhv. Kvinde Senior 1 og
--   kan aldrig blive ledige for andre hold, uanset dag. Rum 11 findes ikke.
--   Ingen af dem kan derfor optræde i "Ledige omkl.", og testdataene bruger
--   dem ikke.
--   Mandag optages 1,2,3,6,10 -> forventet ledigt: 4, 5, 8, 12
--   Tirsdag optages 4,5,8,12  -> forventet ledigt: 1, 2, 3, 6, 10
--   Onsdag optages 1,2        -> forventet ledigt: 3, 4, 5, 6, 8, 10, 12
--   Lørdag optages 1,3        -> forventet ledigt: 2, 4, 5, 6, 8, 10, 12
--   Søndag optages ingen      -> forventet ledigt: alle ni
--
-- Kolonnen "room" bruger "-" for ingen omklædning, som i den nuværende
-- produktionsplan. ScheduleView skjuler feltet når værdien er "-"
-- (hasRoom i schedule-view.tsx).
