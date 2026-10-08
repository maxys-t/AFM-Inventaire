-- ============================================================
-- 017 — Plusieurs photos par dossier de réparation
--
-- Une panne se documente rarement en une image : le connecteur
-- arraché, la trace sur le flanc et l'écran qui n'affiche rien sont
-- trois choses à montrer. Les colonnes texte uniques de la 016
-- deviennent des listes.
--
-- Les photos déjà enregistrées sont reprises telles quelles. Les
-- anciennes colonnes sont supprimées APRÈS vérification, dans la
-- même transaction : deux sources de vérité pour la même donnée,
-- c'est la garantie qu'elles divergeront.
-- ============================================================

begin;

alter table public.repairs
  add column if not exists photos_open   jsonb not null default '[]'::jsonb,
  add column if not exists photos_return jsonb not null default '[]'::jsonb;

-- Reprise, uniquement là où la liste est encore vide : la migration
-- peut ainsi être relancée sans dupliquer les images.
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='repairs'
                and column_name='photo_open') then
    update public.repairs
       set photos_open = jsonb_build_array(photo_open)
     where photo_open is not null and photo_open <> ''
       and photos_open = '[]'::jsonb;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='repairs'
                and column_name='photo_return') then
    update public.repairs
       set photos_return = jsonb_build_array(photo_return)
     where photo_return is not null and photo_return <> ''
       and photos_return = '[]'::jsonb;
  end if;
end $$;

-- Contrôle : aucune photo ne doit avoir été perdue en route.
do $$ declare n int; begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='repairs'
                and column_name='photo_open') then
    select count(*) into n from public.repairs
     where photo_open is not null and photo_open <> ''
       and not (photos_open @> to_jsonb(photo_open));
    if n > 0 then raise exception '% photo(s) d''ouverture non reprise(s)', n; end if;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='repairs'
                and column_name='photo_return') then
    select count(*) into n from public.repairs
     where photo_return is not null and photo_return <> ''
       and not (photos_return @> to_jsonb(photo_return));
    if n > 0 then raise exception '% photo(s) de retour non reprise(s)', n; end if;
  end if;
end $$;

alter table public.repairs drop column if exists photo_open;
alter table public.repairs drop column if exists photo_return;

-- Garde-fou : ces colonnes doivent contenir des listes, pas autre chose.
alter table public.repairs drop constraint if exists repairs_photos_chk;
alter table public.repairs add constraint repairs_photos_chk
  check (jsonb_typeof(photos_open) = 'array'
     and jsonb_typeof(photos_return) = 'array');

commit;

-- Vérification :
--   select id, jsonb_array_length(photos_open) from repairs;
