-- ============================================================
-- 027 — Ranger les items d'un projet dans ses caisses
--
-- CE QUE CETTE MIGRATION AJOUTE
--
-- Un projet mêle des caisses et des items isolés. Les caisses savent
-- ce qu'elles contiennent, les items isolés ne savent rien : ils
-- partent « en vrac », et c'est à la personne qui charge de se
-- souvenir où elle les a mis.
--
-- Un rangement répond à cette question : POUR CE PROJET, le pied
-- PST-001 voyage dans la Pelicase. La recette de la Pelicase n'est
-- pas touchée — elle ne contient toujours pas ce pied, et la tournée
-- suivante repartira du réel. C'est un fait de chargement, pas une
-- définition de caisse ; il appartient donc au projet.
--
-- Même famille que `subs` (migration 026), et même raison : le geste
-- se fait la caisse à la main, au moment de charger.
--
-- ⚠️ SAUVEGARDE AVANT. Aucune donnée n'est modifiée.
-- ============================================================

begin;

do $$ begin
  if to_regclass('public.projects') is null then
    raise notice 'Table projects absente — passez la 003 d''abord.';
    return;
  end if;

  /* { "<item_id>": "<pack_id>" } — un item est rangé dans au plus une
     caisse, ce que la forme garantit d'elle-même : une clé, une
     valeur. C'est voulu. Un objet ne peut pas être dans deux caisses
     à la fois, et c'est précisément le genre de contradiction qu'on
     ne veut pas pouvoir écrire. */
  execute 'alter table public.projects
             add column if not exists placements jsonb not null default ''{}''::jsonb';
end $$;

-- ------------------------------------------------------------
-- Contrôles
-- ------------------------------------------------------------
do $$ declare n int; begin
  if to_regclass('public.projects') is null then return; end if;

  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='projects' and column_name='placements';
  if n <> 1 then raise exception 'La colonne projects.placements manque'; end if;

  select count(*) into n from public.projects
   where placements is null or jsonb_typeof(placements) <> 'object';
  if n > 0 then raise exception '% projet(s) avec un rangement mal formé', n; end if;

  raise notice 'Rangements de projet : colonne prête.';
end $$;

commit;

-- Vérification après coup :
--   select name, jsonb_object_keys(placements) from projects
--    where placements <> '{}'::jsonb;
