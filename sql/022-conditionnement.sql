-- ============================================================
-- 022 — Conditionnement
--
-- Un item a-t-il une housse, un étui, une boîte prévue pour le
-- transport ? En vue des tournées à venir, c'est la question qu'on
-- se pose avant de charger — et la liste de ce qui n'en a pas est
-- une liste d'achats.
--
-- Volontairement un booléen et rien de plus. Le détail de ce qu'est
-- ce conditionnement a déjà sa place dans les notes de l'item ; en
-- faire un champ structuré maintenant, ce serait inventer un besoin.
-- ============================================================

begin;

alter table public.items
  add column if not exists has_case boolean not null default false;

create index if not exists items_has_case_idx on public.items (has_case)
  where has_case = false;

commit;

-- Vérification :
--   select count(*) filter (where has_case) as avec,
--          count(*) filter (where not has_case) as sans
--     from items where deleted_at is null;
