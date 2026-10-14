-- ============================================================
-- 024 — Un pack est une recette, un projet est un mélange
--
-- CE QUE CETTE MIGRATION CHANGE DE FOND
--
-- Depuis la 021, un item appartenait à UN pack au plus. C'était la
-- bonne correction à l'époque : la 019 portait deux relations
-- concurrentes — le plan et la position — et on ne savait jamais
-- laquelle on manipulait.
--
-- Mais la cardinalité n'était pas le problème, la concurrence des
-- deux relations l'était. Or un pack n'est pas « l'endroit où vit un
-- item » : c'est une RECETTE, un préréglage réutilisable. Le même
-- préampli figure dans la config du rack studio et dans la config de
-- la Pelicase de tournée. Ce sont deux recettes ; une seule est
-- montée à la fois.
--
-- Il reste donc UNE seule relation, `pack_items`. On lève simplement
-- son unicité. « Où est cet item ? » se lit sur son emplacement et
-- son statut de sortie — jamais sur le pack. Chacun son rôle.
--
-- Trois ajouts vont avec :
--   packs.permanent  — monté en permanence (rack studio) ou simple
--                      configuration. « Absent » ne veut pas dire la
--                      même chose dans les deux cas : un trou dans le
--                      rack signale un problème, une config non
--                      montée ne manque de rien.
--   pack_extras      — les consommables : gaffer, colliers, piles.
--                      Une ligne de checklist, PAS un item. Ni
--                      identifiant, ni fiche, ni historique, ni poids
--                      compté dans le total — ce total sert à parler
--                      à un transporteur.
--   projects.pack_ids / snapshot — un projet est un mélange de packs
--                      et d'items isolés. Tant qu'il se prépare, son
--                      contenu suit les packs ; au départ, il est figé
--                      dans `snapshot`, pour que vider une caisse le
--                      lendemain ne réécrive pas ce qui est parti.
--
-- ⚠️ SAUVEGARDE AVANT. Aucun identifiant ne change et rien n'est
-- supprimé, mais la contrainte d'unicité disparaît pour de bon.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Un item peut figurer dans plusieurs recettes
-- ------------------------------------------------------------
drop index if exists public.pack_items_one_pack_per_item;

-- La clé primaire (pack_id, item_id) reste : deux fois le même item
-- dans la même recette n'aurait toujours aucun sens.

-- ------------------------------------------------------------
-- 2. Monté en permanence, ou configuration
-- ------------------------------------------------------------
alter table public.packs
  add column if not exists permanent boolean not null default false;

comment on column public.packs.permanent is
  'true = assemblage monté en permanence (rack studio) : un item absent est un manque. '
  'false = configuration réutilisable : rien ne manque tant qu''elle n''est pas montée.';

-- ------------------------------------------------------------
-- 3. Les consommables
--    Volontairement pauvre : un libellé, une quantité, un rang.
--    Tout ce qu'on pourrait y ajouter (poids, photo, état) en ferait
--    un item au rabais, et l'on aurait deux sortes d'items à gérer
--    partout. Ce sont des lignes de checklist, rien de plus.
-- ------------------------------------------------------------
create table if not exists public.pack_extras (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references public.packs(id) on delete cascade,
  label      text not null,
  qty        integer not null default 1,
  pos        integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pack_extras drop constraint if exists pack_extras_qty_chk;
alter table public.pack_extras add constraint pack_extras_qty_chk
  check (qty > 0 and qty <= 9999);

alter table public.pack_extras drop constraint if exists pack_extras_label_chk;
alter table public.pack_extras add constraint pack_extras_label_chk
  check (length(btrim(label)) between 1 and 120);

create index if not exists pack_extras_pack_idx on public.pack_extras (pack_id, pos);

-- ------------------------------------------------------------
-- 4. Les projets accueillent des packs
-- ------------------------------------------------------------
do $$ begin
  if to_regclass('public.projects') is null then
    raise notice 'Table projects absente — passez la 003 d''abord.';
    return;
  end if;

  execute 'alter table public.projects
             add column if not exists pack_ids jsonb not null default ''[]''::jsonb';
  -- Le contenu figé au moment du départ. Nul tant que le projet n'est
  -- pas parti.
  execute 'alter table public.projects
             add column if not exists snapshot jsonb';
end $$;

-- ------------------------------------------------------------
-- 5. Droits
--    Les consommables suivent la règle des packs : un stagiaire peut
--    cocher une préparation, pas redéfinir une recette.
-- ------------------------------------------------------------
alter table public.pack_extras enable row level security;

drop policy if exists "pack_extras_select" on public.pack_extras;
create policy "pack_extras_select" on public.pack_extras
  for select to authenticated using (is_member());
drop policy if exists "pack_extras_write" on public.pack_extras;
create policy "pack_extras_write" on public.pack_extras
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

-- La composition d'un projet reste réservée aux administrateurs. La
-- 005 citait item_ids ; pack_ids relève de la même règle, sans quoi
-- on refermerait d'une main ce qu'on vient d'ouvrir de l'autre.
create or replace function guard_projects_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if can_edit_inventory() then return new; end if;

  if new.name          is distinct from old.name
  or new.description   is distinct from old.description
  or new.item_ids::text is distinct from old.item_ids::text
  or coalesce(new.pack_ids::text,'[]') is distinct from coalesce(old.pack_ids::text,'[]') then
    raise exception 'Modification du projet réservée aux administrateurs';
  end if;

  return new;
end $$;

do $$ begin
  if to_regclass('public.projects') is not null then
    drop trigger if exists guard_projects on public.projects;
    create trigger guard_projects before update on public.projects
      for each row execute function guard_projects_update();
  end if;
end $$;

-- ------------------------------------------------------------
-- 6. Les boucles, revues pour plusieurs parents
--
--    L'ancien contrôle remontait UNE chaîne de parents avec un
--    `limit 1`. Tant qu'un item n'avait qu'un pack, cette chaîne
--    était l'arbre entier. Elle ne l'est plus : un pack peut
--    désormais figurer dans plusieurs recettes, et un `limit 1`
--    choisirait arbitrairement une branche, laissant passer une
--    boucle par l'autre. On remonte donc TOUS les ancêtres.
-- ------------------------------------------------------------
create or replace function pack_cycle_check()
returns trigger language plpgsql as $$
declare
  cible uuid;   -- le pack que l'item inséré représente, s'il en représente un
  n     int;
begin
  select p.id into cible from public.packs p where p.container_id = new.item_id;
  if cible is null then return new; end if;              -- pas un contenant
  if cible = new.pack_id then
    raise exception 'Un contenant ne peut pas être rangé dans son propre pack';
  end if;

  with recursive anc(pack_id, profondeur) as (
      select new.pack_id, 0
    union all
      select parent.id, a.profondeur + 1
        from anc a
        join public.packs courant  on courant.id = a.pack_id
        join public.pack_items pi  on pi.item_id = courant.container_id
        join public.packs parent   on parent.id = pi.pack_id
       where a.profondeur < 20
  )
  select count(*) into n from anc where pack_id = cible;

  if n > 0 then
    raise exception 'Boucle de rangement : ce pack se retrouverait à l''intérieur de lui-même';
  end if;
  return new;
end $$;

drop trigger if exists pack_items_no_cycle on public.pack_items;
create trigger pack_items_no_cycle before insert or update on public.pack_items
  for each row execute function pack_cycle_check();

-- ------------------------------------------------------------
-- 7. Temps réel
-- ------------------------------------------------------------
do $$ begin
  begin
    execute 'alter publication supabase_realtime add table pack_extras';
  exception when duplicate_object then null;
  end;
end $$;

-- ------------------------------------------------------------
-- 8. Contrôles avant validation
-- ------------------------------------------------------------
do $$ declare n int; begin
  select count(*) into n from pg_indexes
   where schemaname='public' and indexname='pack_items_one_pack_per_item';
  if n > 0 then raise exception 'L''index d''unicité est toujours là'; end if;

  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='packs' and column_name='permanent';
  if n <> 1 then raise exception 'La colonne packs.permanent manque'; end if;

  if to_regclass('public.pack_extras') is null then
    raise exception 'La table pack_extras n''a pas été créée';
  end if;

  if to_regclass('public.projects') is not null then
    select count(*) into n from information_schema.columns
     where table_schema='public' and table_name='projects'
       and column_name in ('pack_ids','snapshot');
    if n <> 2 then raise exception 'Les colonnes pack_ids / snapshot manquent (% sur 2)', n; end if;
  end if;

  -- Rien n'a dû disparaître en chemin.
  select count(*) into n from public.pack_items;
  raise notice '% ligne(s) de contenu de pack conservée(s).', n;
end $$;

commit;

-- Vérification après coup :
--   select p.name, p.permanent, count(pi.item_id) as items
--     from packs p left join pack_items pi on pi.pack_id = p.id
--    group by p.id, p.name, p.permanent order by p.name;
--   select item_id, count(*) from pack_items group by item_id having count(*) > 1;
