-- ============================================================
-- 025 — Quatre états, au lieu de trois
--
-- CE QUE CETTE MIGRATION CHANGE
--
-- Depuis la 016, items.cond ne décrit que l'état physique :
--   'bon'  état correct
--   'use'  marqué, usé
--   'hs'   hors service
--
-- Il manquait la case du milieu. Entre « usé mais ça marche » et
-- « sorti du parc », il y a l'objet qui ne fonctionne plus et qu'on
-- va réparer. Faute de pouvoir le dire, on le marquait 'hs', ce qui
-- le retirait du parc — ou 'use', ce qui prétendait qu'il marche.
--
-- D'où un quatrième état :
--   'ko'   en panne : ne fonctionne pas, toujours au parc
--
-- La frontière avec 'hs' n'est pas un degré de gravité, c'est une
-- décision : 'ko' se répare, 'hs' a été retiré du parc.
--
-- AUCUNE DONNÉE N'EST MODIFIÉE. Les items actuellement 'hs' le
-- restent : c'est la définition qu'ils portaient déjà. On ouvre
-- simplement une valeur de plus.
-- ============================================================

begin;

alter table public.items drop constraint if exists items_cond_chk;
alter table public.items add constraint items_cond_chk
  check (cond in ('bon','use','ko','hs'));

comment on column public.items.cond is
  'État physique seul (l''étape de réparation vit dans la table repairs). '
  'bon = correct · use = endommagé mais fonctionnel · '
  'ko = en panne, toujours au parc · hs = retiré du parc.';

-- L'historique enregistre l'état constaté au retour : même vocabulaire.
do $$ begin
  if exists (select 1 from information_schema.constraint_column_usage
              where table_schema='public' and table_name='history'
                and constraint_name like '%cond%') then
    execute 'alter table public.history drop constraint if exists history_cond_chk';
  end if;
exception when others then null;
end $$;

-- ------------------------------------------------------------
-- Contrôles
-- ------------------------------------------------------------
do $$ declare n int; begin
  select count(*) into n from public.items
   where cond is null or cond not in ('bon','use','ko','hs');
  if n > 0 then raise exception '% item(s) avec un état hors liste', n; end if;

  /* Rien n'a dû bouger : on le dit, plutôt que de le supposer. */
  select count(*) into n from public.items where cond = 'hs';
  raise notice '% item(s) hors service — inchangés.', n;
  select count(*) into n from public.items where cond = 'ko';
  raise notice '% item(s) en panne (aucun pour l''instant, c''est normal).', n;
end $$;

commit;

-- Vérification après coup :
--   select cond, count(*) from items group by cond order by cond;
