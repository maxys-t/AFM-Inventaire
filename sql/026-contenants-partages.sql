-- ============================================================
-- 026 — Un contenant peut porter plusieurs recettes
--
-- CE QUE CETTE MIGRATION CHANGE
--
-- La 019 imposait un pack au plus par contenant : sinon « qu'y a-t-il
-- dans cette caisse » n'avait pas de réponse. Juste tant qu'un pack
-- décrivait un rangement réel.
--
-- Depuis la 024, un pack est une RECETTE. La même Pelicase sert à la
-- config du trio et à celle du quintet : deux recettes, une seule
-- montée à la fois. L'interdire obligeait à inventer deux caisses
-- pour une seule boîte.
--
-- La règle devient donc : un contenant peut backer autant de
-- configurations qu'on veut, mais **un seul assemblage monté**. C'est
-- l'assemblage monté qui répond à « qu'y a-t-il dedans » — et qui
-- porte l'imbrication et le poids. Une configuration non montée
-- n'occupe pas la caisse, donc ne revendique rien.
--
-- On en profite pour ajouter projects.subs : au sein d'un projet, un
-- exemplaire réclamé par deux caisses peut être remplacé dans l'une
-- des deux. C'est une décision propre au projet — la recette, elle,
-- ne change pas.
--
-- ⚠️ SAUVEGARDE AVANT. Aucune donnée n'est modifiée.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Plusieurs recettes par contenant
-- ------------------------------------------------------------
drop index if exists public.packs_container_uniq;

-- Mais un seul assemblage monté : deux racks « montés » autour du même
-- meuble décriraient deux contenus simultanés du même objet.
create unique index if not exists packs_container_assembled_uniq
  on public.packs (container_id)
  where container_id is not null and permanent and not archived;

comment on index public.packs_container_assembled_uniq is
  'Un contenant peut servir à plusieurs configurations, mais n''être '
  'monté qu''une fois : c''est l''assemblage monté qui dit ce qu''il y a dedans.';

-- ------------------------------------------------------------
-- 2. Les substitutions d'un projet
--    Table de correspondance « pack|item » → autre exemplaire, propre
--    à CE projet. La recette n'est pas touchée : deux tournées
--    successives peuvent substituer différemment.
-- ------------------------------------------------------------
do $$ begin
  if to_regclass('public.projects') is null then
    raise notice 'Table projects absente — passez la 003 d''abord.';
    return;
  end if;
  execute 'alter table public.projects
             add column if not exists subs jsonb not null default ''{}''::jsonb';
end $$;

/* Substituer n'est pas recomposer : on ne change pas CE qui part, on
   choisit QUEL exemplaire part. Ce geste se fait la caisse à la main,
   au moment de charger — donc il reste ouvert aux membres, comme la
   checklist, et n'entre pas dans le garde-fou de la 024. */

-- ------------------------------------------------------------
-- 3. Contrôles
-- ------------------------------------------------------------
do $$ declare n int; begin
  select count(*) into n from pg_indexes
   where schemaname='public' and indexname='packs_container_uniq';
  if n > 0 then raise exception 'L''ancienne unicité du contenant est toujours là'; end if;

  select count(*) into n from pg_indexes
   where schemaname='public' and indexname='packs_container_assembled_uniq';
  if n <> 1 then raise exception 'L''unicité du contenant monté n''a pas été créée'; end if;

  /* Si deux packs montés partagent déjà un contenant, l'index
     ci-dessus a échoué et la transaction est déjà annulée. On le dit
     quand même, pour que le message soit lisible. */
  select count(*) into n from (
    select container_id from public.packs
     where container_id is not null and permanent and not archived
     group by container_id having count(*) > 1) t;
  if n > 0 then
    raise exception '% contenant(s) portent déjà deux assemblages montés — '
      'décochez « monté en permanence » sur l''un des deux', n;
  end if;

  if to_regclass('public.projects') is not null then
    select count(*) into n from information_schema.columns
     where table_schema='public' and table_name='projects' and column_name='subs';
    if n <> 1 then raise exception 'La colonne projects.subs manque'; end if;
  end if;
end $$;

commit;

-- Vérification après coup :
--   select container_id, count(*) filter (where permanent) as montes, count(*) as total
--     from packs where container_id is not null group by container_id having count(*) > 1;
