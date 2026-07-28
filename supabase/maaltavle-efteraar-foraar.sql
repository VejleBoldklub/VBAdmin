-- Læg måloversigten ind i Efterår / Forår-planen
-- ==============================================
--
-- Værdierne er hentet direkte fra den nuværende offentlige side,
-- public/legacy/efteraar-foraar.html, hvor tabellen ligger som statisk markup.
--
-- Kør i Supabase → SQL Editor. Kan køres igen; feltet overskrives.
--
-- Vinterplanen får bevidst INGEN måloversigt. Alle mål er om vinteren samlet på
-- to baner, så der er ingen fordeling at vise. Legacy-siden viser i dag den
-- samme tavle for vinter, men den er forældet og retvisende kun for efterår.

-- Bemærk at BÅDE live-planen og en eventuel åben kladde opdateres.
--
-- Publicering erstatter live-planens data med kladdens. Opdaterede vi kun
-- live-planen, ville måloversigten forsvinde igen, næste gang en eksisterende
-- kladde blev publiceret.
update baneplan_versioner
   set data = jsonb_set(data, '{maaltavle}', $json$
{
  "raekker": [
    {
      "type": "3-mands",
      "celler": [
        { "baner": ["Bane 2"],                 "vaerdi": "-" },
        { "baner": ["Bane 3"],                 "vaerdi": "7 x m/hjul" },
        { "baner": ["Bane 6", "Bane 7"],       "vaerdi": "6 x u/hjul" },
        { "baner": ["Bane 8", "Bane 9"],       "vaerdi": "6 x u/hjul" },
        { "baner": ["Bane 10/11"],             "vaerdi": "5 x u/hjul + 4 x u/hjul (tunge)" }
      ]
    },
    {
      "type": "5-mands",
      "celler": [
        { "baner": ["Bane 2"],     "vaerdi": "-" },
        { "baner": ["Bane 3"],     "vaerdi": "-" },
        { "baner": ["Bane 6"],     "vaerdi": "-" },
        { "baner": ["Bane 7"],     "vaerdi": "-" },
        { "baner": ["Bane 8"],     "vaerdi": "-" },
        { "baner": ["Bane 9"],     "vaerdi": "-" },
        { "baner": ["Bane 10/11"], "vaerdi": "8 x u/hjul" }
      ]
    },
    {
      "type": "8-mands",
      "celler": [
        { "baner": ["Bane 2"],     "vaerdi": "4 x m/hjul" },
        { "baner": ["Bane 3"],     "vaerdi": "2 x m/hjul" },
        { "baner": ["Bane 6"],     "vaerdi": "-" },
        { "baner": ["Bane 7"],     "vaerdi": "4 x m/hjul" },
        { "baner": ["Bane 8"],     "vaerdi": "4 x u/hjul" },
        { "baner": ["Bane 9"],     "vaerdi": "4 x u/hjul" },
        { "baner": ["Bane 10/11"], "vaerdi": "-" }
      ]
    },
    {
      "type": "11-mands",
      "celler": [
        { "baner": ["Bane 2"],     "vaerdi": "2 x u/hjul + 1 x m/hjul" },
        { "baner": ["Bane 3"],     "vaerdi": "2 x u/hjul + 1 x m/hjul" },
        { "baner": ["Bane 6"],     "vaerdi": "2 x m/hjul" },
        { "baner": ["Bane 7"],     "vaerdi": "2 x m/hjul" },
        { "baner": ["Bane 8"],     "vaerdi": "2 x u/hjul" },
        { "baner": ["Bane 9"],     "vaerdi": "2 x u/hjul" },
        { "baner": ["Bane 10/11"], "vaerdi": "-" }
      ]
    }
  ]
}
$json$::jsonb, true)
 where plan_slug = 'efteraar-foraar'
   and status in ('live', 'draft');

-- Åbent spørgsmål, bevaret i dataene frem for besluttet her
-- ========================================================
--
-- I 3-mands-rækken dækker "6 x u/hjul" både Bane 6 og Bane 7, og en tilsvarende
-- celle dækker Bane 8 og Bane 9. Det står ikke nogen steder, om der er seks mål
-- PR. BANE eller seks mål DELT mellem de to.
--
-- Sammenlægningen er derfor bevaret præcis som i den oprindelige tavle, hvor den
-- er lige så tvetydig. Visningen gengiver den som én celle over to baner, altså
-- uden at tage stilling. Er svaret kendt, kan cellen splittes i to med hver sin
-- værdi, uden at noget andet skal laves om.

-- Kontrol
-- =======
--   select plan_slug, status, jsonb_array_length(data -> 'maaltavle' -> 'raekker') as raekker
--     from baneplan_versioner
--    where plan_slug = 'efteraar-foraar';
--   -- raekker skal være 4
