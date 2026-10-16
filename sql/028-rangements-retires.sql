-- ============================================================
-- 028 — Retour en arrière : les rangements de projet n'existent plus
--
-- La 027 avait ouvert `projects.placements` : un item isolé pouvait
-- être rangé dans une caisse POUR UN PROJET SEULEMENT, sans entrer
-- dans sa recette.
--
-- L'idée n'a pas survécu à la question « donne-moi un cas concret ».
-- Il n'y en avait pas. L'application ne peut pas savoir si l'objet
-- ressort de la caisse au déballage — seule la personne qui déballe
-- le sait — et prétendre le contraire obligeait à refaire le même
-- geste à chaque tournée, au lieu de converger vers des recettes
-- justes.
--
-- La règle est donc la plus simple : une caisse, c'est ce qu'il y a
-- dedans. Lâcher un objet dessus l'y met pour de bon, avec une
-- annulation à portée. Vérifiable en ouvrant la caisse.
--
-- La colonne est retirée parce qu'une colonne inutilisée finit
-- toujours par être réemployée pour autre chose, trois ans plus tard,
-- par quelqu'un qui n'aura pas lu ceci.
--
-- ⚠️ SAUVEGARDE AVANT. Si des rangements ont été saisis entre la 027
-- et la 028, ils sont perdus — le contrôle ci-dessous les compte et
-- refuse d'effacer en silence.
-- ============================================================

begin;

do $$ declare n int; begin
  if to_regclass('public.projects') is null then return; end if;

  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='projects' and column_name='placements';
  if n = 0 then
    raise notice 'La colonne placements n''existe pas (la 027 n''a pas été passée) — rien à faire.';
    return;
  end if;

  execute 'select count(*) from public.projects
            where placements is not null and placements <> ''{}''::jsonb'
    into n;
  if n > 0 then
    raise notice '% projet(s) portaient des rangements. Ils sont effacés : '
                 'ce que vous avez rangé dans une caisse est désormais à y '
                 'remettre depuis le projet, et y restera.', n;
  end if;

  execute 'alter table public.projects drop column placements';
end $$;

do $$ declare n int; begin
  if to_regclass('public.projects') is null then return; end if;
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='projects' and column_name='placements';
  if n > 0 then raise exception 'La colonne placements est toujours là'; end if;
end $$;

commit;
