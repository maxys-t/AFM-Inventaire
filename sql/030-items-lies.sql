-- ============================================================
-- 030 — Un item attitré à un autre
--
-- CE QUE ÇA RÈGLE
--
-- Le Germanium Preamp ne fonctionne pas sans le Germanium PSU, et ce
-- PSU-là est un VRAI objet : il a une valeur, un numéro de série, il
-- peut tomber en panne, être prêté, partir en réparation. Le traiter
-- comme une ligne de checklist — « bloc d'alim × 1 » — perdrait tout
-- ça.
--
-- La 029 avait prévu le cas sans l'exposer : la colonne
-- `needs_item_id` désignait déjà un item suivi. Cette migration ne
-- fait qu'y ajouter les deux garde-fous que l'usage réclame.
--
-- 1. UN SEUL PARENT
--
-- Un PSU attitré l'est à un appareil, pas à trois. C'est une décision
-- d'usage, et elle a une conséquence heureuse : avec un parent
-- unique, un item lié NE PEUT PAS être réclamé par deux projets à la
-- fois. Le conflit de disponibilité entre parents disparaît par
-- construction, au lieu d'être détecté après coup.
--
-- Le jour où un boîtier en alimente réellement deux, il faudra lever
-- cet index — et rouvrir la question du conflit en même temps. Les
-- deux vont ensemble ; c'est pour ça qu'ils sont écrits ici côte à
-- côte.
--
-- 2. PAS DE BOUCLE
--
-- « A a besoin de B, B a besoin de A » fige n'importe quel calcul de
-- contenu. La base refusait déjà qu'un item ait besoin de lui-même
-- (029) ; il reste les chaînes plus longues.
--
-- Le contrôle remonte TOUS les ancêtres par une CTE récursive, et
-- non une seule chaîne avec `limit 1`. C'est exactement l'erreur que
-- la 024 a dû corriger sur les packs : un item peut déclarer
-- plusieurs dépendances suivies, et choisir arbitrairement une
-- branche laisserait passer une boucle par l'autre.
--
-- ⚠️ SAUVEGARDE AVANT. Si des liens existent déjà et violent
-- l'unicité, la création de l'index échouera en le disant : la
-- requête de diagnostic en bas du fichier les liste.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Un item lié n'a qu'un seul parent
-- ------------------------------------------------------------
drop index if exists public.item_needs_un_seul_parent;
create unique index item_needs_un_seul_parent
  on public.item_needs (needs_item_id)
  where needs_item_id is not null;

comment on index public.item_needs_un_seul_parent is
  'Un item suivi est attitré à UN appareil. Conséquence : il ne peut '
  'pas être réclamé par deux projets à la fois, donc le conflit entre '
  'parents n''existe pas. Lever cet index obligerait à le rouvrir.';

-- ------------------------------------------------------------
-- 2. Pas de boucle dans les dépendances
-- ------------------------------------------------------------
create or replace function item_needs_cycle_check()
returns trigger language plpgsql as $$
declare
  boucle boolean;
begin
  if new.needs_item_id is null then return new; end if;

  -- On part de la cible et on descend ses propres dépendances, toutes
  -- branches confondues. Si l'on retombe sur l'item qui déclare, la
  -- chaîne se referme.
  with recursive descendance(id, profondeur) as (
    select new.needs_item_id, 0
    union all
    select n.needs_item_id, d.profondeur + 1
      from public.item_needs n
      join descendance d on n.item_id = d.id
     where n.needs_item_id is not null
       and d.profondeur < 20          -- un filet, pas une limite d'usage
  )
  select exists(select 1 from descendance where id = new.item_id) into boucle;

  if boucle then
    raise exception 'Dépendance circulaire : % finirait par avoir besoin de lui-même',
      new.item_id;
  end if;
  return new;
end $$;

drop trigger if exists item_needs_cycle on public.item_needs;
create trigger item_needs_cycle
  before insert or update on public.item_needs
  for each row execute function item_needs_cycle_check();

-- ------------------------------------------------------------
-- 3. Vérification
--    À copier dans l'éditeur SQL de Supabase après la migration.
-- ------------------------------------------------------------
-- -- L'index et le déclencheur existent-ils ?
-- select indexname from pg_indexes
--  where tablename = 'item_needs' and indexname = 'item_needs_un_seul_parent';
-- select tgname from pg_trigger
--  where tgrelid = 'public.item_needs'::regclass and not tgisinternal;
--
-- -- Si la création de l'index a échoué : voici les coupables.
-- select needs_item_id, count(*), array_agg(item_id)
--   from public.item_needs
--  where needs_item_id is not null
--  group by needs_item_id having count(*) > 1;
