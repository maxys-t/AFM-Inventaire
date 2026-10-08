-- ============================================================
-- 018 — Poids des items
--
-- Stocké en GRAMMES, en entier. Un poids en kilos flottant finit
-- toujours par produire des totaux du genre 2930,0000000004 ;
-- l'entier ne ment pas, et l'affichage fait la conversion.
--
-- `weight_est` dit si le chiffre est une mesure ou une estimation.
-- Sans ce drapeau, un total de caisse donne la même confiance à un
-- piano pesé et à une peau de batterie devinée — et c'est le genre
-- de chiffre qu'on lit face à une limite de transporteur.
-- ============================================================

begin;

alter table public.items
  add column if not exists weight_g   integer,
  add column if not exists weight_est boolean not null default false;

alter table public.items drop constraint if exists items_weight_chk;
alter table public.items add constraint items_weight_chk
  check (weight_g is null or (weight_g > 0 and weight_g < 2000000));

create index if not exists items_weight_idx on public.items (weight_g);

-- Un stagiaire peut déjà corriger l'état ou l'emplacement d'un item ;
-- le poids relève de la même catégorie : une donnée constatée, pas
-- une donnée de fiche. Le garde-fou n'a donc rien à interdire de plus.

commit;

-- Vérification :
--   select count(*) filter (where weight_g is not null) as pesés,
--          count(*) filter (where weight_g is null)     as sans,
--          round(sum(weight_g)/1000.0, 1)               as total_kg
--     from items where deleted_at is null;
