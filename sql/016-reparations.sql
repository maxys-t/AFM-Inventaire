-- ============================================================
-- 016 — Réparations : dossiers d'incident et prestataires
--
-- CE QUE CETTE MIGRATION CHANGE DE FOND
--
-- Jusqu'ici, un seul champ — items.cond — portait deux choses de
-- nature différente : l'état physique de l'objet (bon, abîmé) ET
-- l'étape de sa réparation (en attente, en réparation). Impossible,
-- dans ce modèle, de dire « revenu réparé mais reste fragile ».
--
-- Désormais :
--   items.cond        = l'état physique, et rien d'autre
--                       'bon' | 'use' (marqué, usé) | 'hs' (hors service)
--   une ligne repairs = l'étape de réparation en cours
--                       'open' (signalé) | 'sent' (chez un prestataire)
--
-- Un item « en attente de réparation » n'est donc plus un état : c'est
-- un item qui a un dossier ouvert. D'où la règle structurante du
-- cahier des charges — pas de dossier sans incident.
--
-- ⚠️ SAUVEGARDE AVANT. Aucun identifiant ne change, mais la
-- signification de items.cond change pour de bon.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Les prestataires
--    Table à part, et non un emplacement « off-site » : un atelier
--    a un délai, une spécialité et un historique de qualité, qu'un
--    lieu de tournée n'a pas.
-- ------------------------------------------------------------
create table if not exists public.repair_providers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  specialty     text,
  contact       text,
  phone         text,
  email         text,
  addr_line1    text,
  addr_zip      text,
  addr_city     text,
  addr_country  text,
  notes         text,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

create unique index if not exists repair_providers_name_uniq
  on public.repair_providers (lower(name)) where archived = false;

-- ------------------------------------------------------------
-- 2. Les dossiers de réparation
-- ------------------------------------------------------------
create table if not exists public.repairs (
  id             uuid primary key default gen_random_uuid(),
  item_id        text not null references public.items(id)
                   on update cascade on delete cascade,

  -- Signalement
  fault          text not null,
  description    text,
  cond_at_open   text,          -- l'état physique constaté au départ
  photo_open     text,          -- la preuve qui va avec
  opened_at      timestamptz not null default now(),
  opened_by      uuid,
  opened_by_name text,

  -- Envoi chez un prestataire
  provider_id    uuid references public.repair_providers(id) on delete set null,
  tracking_ref   text,
  sent_at        timestamptz,

  -- Retour
  received_at    timestamptz,
  outcome        text,          -- repaired | partial | unchanged | new_damage
  work_done      text,
  photo_return   text,

  -- Laissés vides pour l'instant : le suivi des coûts n'est pas de
  -- cette version. La colonne existe pour que l'ajouter plus tard
  -- n'oblige pas à reprendre l'historique.
  cost           numeric,
  under_warranty boolean,

  -- Clôture
  closed_at      timestamptz,
  closed_by      uuid,
  destination    text,          -- service | repair | hs
  status         text not null default 'open'
);

alter table public.repairs drop constraint if exists repairs_status_chk;
alter table public.repairs add constraint repairs_status_chk
  check (status in ('open','sent','closed'));

alter table public.repairs drop constraint if exists repairs_outcome_chk;
alter table public.repairs add constraint repairs_outcome_chk
  check (outcome is null or outcome in ('repaired','partial','unchanged','new_damage'));

alter table public.repairs drop constraint if exists repairs_destination_chk;
alter table public.repairs add constraint repairs_destination_chk
  check (destination is null or destination in ('service','repair','hs'));

-- Un item n'a qu'un dossier ouvert à la fois. Sans cette contrainte,
-- deux personnes signalant la même panne le même jour créeraient deux
-- dossiers, et l'item reviendrait « à moitié réparé ».
create unique index if not exists repairs_one_open_per_item
  on public.repairs (item_id) where status <> 'closed';

create index if not exists repairs_item_idx     on public.repairs (item_id);
create index if not exists repairs_status_idx   on public.repairs (status);
create index if not exists repairs_provider_idx on public.repairs (provider_id);

-- ------------------------------------------------------------
-- 3. Reprise de l'existant
--    Les items actuellement marqués 'attente' ou 'reparation'
--    deviennent des dossiers ouverts. Leur état physique n'ayant
--    jamais été saisi séparément, on retient 'use' — prudent, et
--    rectifiable à la main.
-- ------------------------------------------------------------
alter table public.items disable trigger guard_items;

insert into public.repairs (item_id, fault, description, cond_at_open,
                            opened_at, status)
select i.id,
       'other',
       coalesce(
         (select h.detail from public.history h
           where h.item_id = i.id and h.type = 'repair'
           order by h.date desc limit 1),
         'Dossier repris lors de la migration 016.'),
       'use',
       coalesce(
         (select h.date from public.history h
           where h.item_id = i.id and h.type = 'repair'
           order by h.date desc limit 1),
         now()),
       case i.cond when 'reparation' then 'sent' else 'open' end
  from public.items i
 where i.cond in ('attente','reparation')
   and not exists (select 1 from public.repairs r
                    where r.item_id = i.id and r.status <> 'closed');

update public.items set cond = 'use' where cond in ('attente','reparation');

-- 'bon' et 'hs' gardent exactement le sens qu'ils avaient.
-- Toute autre valeur imprévue retombe sur 'use' plutôt que de faire
-- échouer la contrainte ci-dessous.
update public.items set cond = 'use'
 where cond is not null and cond not in ('bon','use','hs');
update public.items set cond = 'bon' where cond is null;

alter table public.items drop constraint if exists items_cond_chk;
alter table public.items add constraint items_cond_chk
  check (cond in ('bon','use','hs'));

alter table public.items enable trigger guard_items;

-- ------------------------------------------------------------
-- 4. Droits
--    Un stagiaire PEUT ouvrir un incident : c'est lui qui constate la
--    panne en session. Il ne peut pas le clore ni toucher aux
--    prestataires — clore engage l'état du parc.
-- ------------------------------------------------------------
alter table public.repair_providers enable row level security;
alter table public.repairs          enable row level security;

drop policy if exists "providers_select" on public.repair_providers;
create policy "providers_select" on public.repair_providers
  for select to authenticated using (is_member());
drop policy if exists "providers_write" on public.repair_providers;
create policy "providers_write" on public.repair_providers
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

drop policy if exists "repairs_select" on public.repairs;
create policy "repairs_select" on public.repairs
  for select to authenticated using (is_member());
drop policy if exists "repairs_insert" on public.repairs;
create policy "repairs_insert" on public.repairs
  for insert to authenticated with check (is_member());
drop policy if exists "repairs_update" on public.repairs;
create policy "repairs_update" on public.repairs
  for update to authenticated
  using (is_member()) with check (is_member());
drop policy if exists "repairs_delete" on public.repairs;
create policy "repairs_delete" on public.repairs
  for delete to authenticated using (is_admin());

-- Le garde-fou qui interdit à un stagiaire de clore un dossier.
create or replace function guard_repairs_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if can_edit_inventory() then return new; end if;
  if new.status = 'closed' and old.status <> 'closed' then
    raise exception 'Clôture d''une réparation réservée aux administrateurs';
  end if;
  if new.item_id is distinct from old.item_id then
    raise exception 'Modification réservée aux administrateurs';
  end if;
  return new;
end $$;

drop trigger if exists guard_repairs on public.repairs;
create trigger guard_repairs before update on public.repairs
  for each row execute function guard_repairs_update();

-- ------------------------------------------------------------
-- 5. Temps réel
--    Sans cela, un signalement fait sur l'iPad en studio n'apparaît
--    pas sur l'écran de la régie avant un rechargement.
-- ------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['repairs','repair_providers'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. Contrôles avant validation
-- ------------------------------------------------------------
do $$ declare n int; begin
  select count(*) into n from public.items where cond not in ('bon','use','hs');
  if n > 0 then raise exception '% item(s) avec un état hors liste', n; end if;

  select count(*) into n from public.items i
   where exists (select 1 from public.repairs r
                  where r.item_id = i.id and r.status <> 'closed')
     and i.cond = 'hs';
  if n > 0 then
    raise exception '% item(s) hors service avec un dossier ouvert', n;
  end if;

  select count(*) into n from (
    select item_id from public.repairs where status <> 'closed'
     group by item_id having count(*) > 1) t;
  if n > 0 then raise exception '% item(s) avec plusieurs dossiers ouverts', n; end if;
end $$;

do $$ declare e char; begin
  select tgenabled into e from pg_trigger
   where tgname = 'guard_items' and tgrelid = 'public.items'::regclass;
  if e is distinct from 'O' then
    raise exception 'guard_items n''a pas été réactivé (état %)', e;
  end if;
end $$;

commit;

-- Vérification après coup :
--   select cond, count(*) from items group by cond;
--   select status, count(*) from repairs group by status;
