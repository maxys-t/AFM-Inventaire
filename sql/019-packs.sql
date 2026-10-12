-- ============================================================
-- 019 — Packs
--
-- Un pack est un regroupement nommé d'items : un rack monté, une
-- Pelicase, une console avec ses cartes. Deux relations, et c'est
-- toute la subtilité du modèle :
--
--   pack_items   ce que le pack DOIT contenir — le plan
--   items.in_pack_id   où l'item se trouve VRAIMENT — la position
--
-- Garder les deux est ce qui permet de dire, au chargement :
-- « il manque trois micros, ils sont dans le Rack B ». Avec le seul
-- plan on ne sait jamais où est l'objet ; avec la seule position on
-- ne sait pas qu'il manque quelque chose.
--
-- L'IMBRICATION NE DEMANDE AUCUNE STRUCTURE. Un pack est représenté
-- par son contenant, qui est un item ordinaire ; ce contenant peut
-- donc être membre d'un autre pack. Un lunchbox dans un rack, c'est
-- l'item « BAE Lunchbox » membre du pack « Rack Studio A », et ce
-- même item contenant du pack « Lunchbox 500 ».
-- ============================================================

begin;

create table if not exists public.packs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  notes        text,
  -- L'item qui sert de contenant : la Pelicase, le meuble, la console.
  -- Nul pour un regroupement sans boîte (un appareil et son alim).
  container_id text references public.items(id) on update cascade on delete set null,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create unique index if not exists packs_name_uniq
  on public.packs (lower(name)) where archived = false;
-- Un item ne peut être le contenant que d'un seul pack : sinon
-- « qu'y a-t-il dans cette caisse » n'a pas de réponse.
create unique index if not exists packs_container_uniq
  on public.packs (container_id) where container_id is not null;

-- Le plan : ce que le pack est censé contenir.
create table if not exists public.pack_items (
  pack_id uuid not null references public.packs(id) on delete cascade,
  item_id text not null references public.items(id)
          on update cascade on delete cascade,
  primary key (pack_id, item_id)
);
create index if not exists pack_items_item_idx on public.pack_items (item_id);

-- La position : dans quel pack l'item se trouve en ce moment.
alter table public.items
  add column if not exists in_pack_id uuid references public.packs(id) on delete set null;
create index if not exists items_in_pack_idx on public.items (in_pack_id);

-- ------------------------------------------------------------
-- Pas de boucle
--   Rien n'empêche, en apparence, de ranger le rack dans le lunchbox
--   qui est dans le rack. Le calcul du poids tournerait alors sans
--   fin. On refuse au moment de l'écriture, où l'on sait encore
--   nommer le coupable — plutôt qu'au calcul, où l'on ne verrait
--   qu'un écran figé.
-- ------------------------------------------------------------
create or replace function pack_cycle_check()
returns trigger language plpgsql as $$
declare
  cible      uuid;   -- le pack que l'item inséré représente, s'il en représente un
  courant    uuid;
  profondeur int := 0;
begin
  select p.id into cible from public.packs p where p.container_id = new.item_id;
  if cible is null then return new; end if;              -- pas un contenant
  if cible = new.pack_id then
    raise exception 'Un contenant ne peut pas être rangé dans son propre pack';
  end if;

  -- On part du pack d'accueil et on remonte ses parents : si l'on
  -- retombe sur le pack de l'item, la boucle se referme.
  courant := new.pack_id;
  while courant is not null loop
    if courant = cible then
      raise exception 'Boucle de rangement : ce pack se retrouverait à l''intérieur de lui-même';
    end if;
    profondeur := profondeur + 1;
    if profondeur > 20 then
      raise exception 'Rangement imbriqué trop profond (plus de 20 niveaux)';
    end if;
    select p.id into courant
      from public.packs p
      join public.pack_items pi on pi.pack_id = p.id
     where pi.item_id = (select container_id from public.packs where id = courant)
     limit 1;
  end loop;
  return new;
end $$;

drop trigger if exists pack_items_no_cycle on public.pack_items;
create trigger pack_items_no_cycle before insert or update on public.pack_items
  for each row execute function pack_cycle_check();

-- Un item ne peut pas être le contenant d'un pack dont il est membre.
create or replace function pack_container_check()
returns trigger language plpgsql as $$
begin
  if new.container_id is not null
     and exists (select 1 from public.pack_items
                  where pack_id = new.id and item_id = new.container_id) then
    raise exception 'Un contenant ne peut pas être rangé dans son propre pack';
  end if;
  return new;
end $$;

drop trigger if exists packs_container_sane on public.packs;
create trigger packs_container_sane before insert or update on public.packs
  for each row execute function pack_container_check();

-- ------------------------------------------------------------
-- Droits : mêmes règles que l'inventaire.
--   Un stagiaire voit les packs et peut y ranger ou en sortir un
--   item — c'est un geste de manutention. Créer, renommer ou
--   supprimer un pack reste aux administrateurs.
-- ------------------------------------------------------------
alter table public.packs      enable row level security;
alter table public.pack_items enable row level security;

drop policy if exists "packs_select" on public.packs;
create policy "packs_select" on public.packs
  for select to authenticated using (is_member());
drop policy if exists "packs_write" on public.packs;
create policy "packs_write" on public.packs
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

drop policy if exists "pack_items_select" on public.pack_items;
create policy "pack_items_select" on public.pack_items
  for select to authenticated using (is_member());
drop policy if exists "pack_items_write" on public.pack_items;
create policy "pack_items_write" on public.pack_items
  for all to authenticated
  using (is_member()) with check (is_member());

-- Temps réel : un pack rempli sur l'iPad doit apparaître en régie.
do $$ declare t text; begin
  foreach t in array array['packs','pack_items'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

commit;

-- Vérification :
--   select p.name, count(pi.item_id) as plan,
--          (select count(*) from items i where i.in_pack_id = p.id) as dedans
--     from packs p left join pack_items pi on pi.pack_id = p.id
--    group by p.id, p.name order by p.name;
