-- ============================================================
-- 021 — Un item est dans un pack, ou il n'y est pas
--
-- La 019 portait deux relations : le PLAN (pack_items) et la
-- POSITION (items.in_pack_id). Conceptuellement juste — ça permettait
-- de dire « il manque trois micros, ils sont dans le Rack B ». À
-- l'usage, illisible : trois états par ligne, un item présent dans
-- plusieurs packs, et des comportements qui se contredisent (la zone
-- « sortir » s'affichait sur l'appartenance, l'action lisait la
-- position, et refusait).
--
-- Une seule relation désormais : `pack_items`. Un item est rangé dans
-- un pack au plus. « Ce qui manque » se lit sur le statut de l'item —
-- sorti, en réparation — ce qui couvre le cas qui compte avant un
-- départ sans inventer une deuxième vérité.
-- ============================================================

begin;

-- 1. Rien ne doit se perdre : une position sans appartenance
--    correspondante devient une appartenance.
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='items'
                and column_name='in_pack_id') then
    insert into public.pack_items(pack_id, item_id)
    select i.in_pack_id, i.id
      from public.items i
     where i.in_pack_id is not null
       and not exists (select 1 from public.pack_items pi
                        where pi.pack_id = i.in_pack_id and pi.item_id = i.id);
  end if;
end $$;

-- 2. Un item ne peut plus appartenir qu'à un seul pack.
--    En cas d'appartenances multiples, on garde celle qui correspond
--    à la position réelle ; à défaut, la première venue.
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='items'
                and column_name='in_pack_id') then
    delete from public.pack_items pi
     using (
       select pi2.item_id,
              coalesce(
                (select i.in_pack_id from public.items i
                  where i.id = pi2.item_id and i.in_pack_id is not null
                    and exists (select 1 from public.pack_items p3
                                 where p3.item_id = pi2.item_id
                                   and p3.pack_id = i.in_pack_id)),
                min(pi2.pack_id::text)::uuid
              ) as garder
         from public.pack_items pi2
        group by pi2.item_id
       having count(*) > 1
     ) d
     where pi.item_id = d.item_id and pi.pack_id <> d.garder;
  end if;
end $$;

-- 3. La règle, inscrite dans la base plutôt que dans l'écran.
create unique index if not exists pack_items_one_pack_per_item
  on public.pack_items (item_id);

-- 4. La position n'existe plus.
alter table public.items drop column if exists in_pack_id;

-- 5. Contrôles
do $$ declare n int; begin
  select count(*) into n from (
    select item_id from public.pack_items group by item_id having count(*) > 1) t;
  if n > 0 then raise exception '% item(s) encore dans plusieurs packs', n; end if;

  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='items' and column_name='in_pack_id';
  if n > 0 then raise exception 'La colonne in_pack_id existe encore'; end if;
end $$;

commit;

-- Vérification :
--   select p.name, count(pi.item_id) as items
--     from packs p left join pack_items pi on pi.pack_id = p.id
--    group by p.id, p.name order by p.name;
