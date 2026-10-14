-- ============================================================
-- 023 — Préciser le conditionnement, et oublier le poids estimé
--
-- « Oui » ne suffit pas : savoir qu'un synthé a une housse n'aide pas
-- à la retrouver. Un champ libre dit laquelle.
--
-- Le drapeau « poids estimé » disparaît. Il distinguait une mesure
-- d'une approximation, ce qui semblait prudent — à l'usage, personne
-- ne s'en sert pour décider quoi que ce soit, et il encombrait chaque
-- total d'une mention que personne ne lisait. 46 items le portaient.
-- ============================================================

begin;

alter table public.items
  add column if not exists case_note text;

-- On n'écrase rien : le champ ne sert que si la case est cochée.
update public.items set case_note = null where has_case = false;

alter table public.items drop column if exists weight_est;

commit;

-- Vérification :
--   select count(*) filter (where has_case) as avec_conditionnement,
--          count(*) filter (where case_note is not null) as precises
--     from items where deleted_at is null;
