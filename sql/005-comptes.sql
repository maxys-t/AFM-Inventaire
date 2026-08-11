-- ============================================================
-- Migration 005 — Comptes, rôles et règles d'accès (v1.0)
-- À coller dans Supabase > SQL Editor > Run. Ré-exécutable sans danger.
--
-- ⚠️ À PARTIR D'ICI, L'APPLICATION EXIGE UNE CONNEXION.
--    Ne l'exécuter en production QU'APRÈS avoir vérifié que la version
--    v1.0 de l'application est déployée (sinon plus personne ne voit rien).
--
-- Le premier compte administrateur est créé à la fin de ce script.
-- ============================================================


-- ------------------------------------------------------------
-- 0. Vérification des prérequis (scripts 001 à 004)
-- ------------------------------------------------------------
do $$
declare manquantes text := '';
begin
  if to_regclass('public.items')     is null then manquantes := manquantes || 'items, ';     end if;
  if to_regclass('public.people')    is null then manquantes := manquantes || 'people, ';    end if;
  if to_regclass('public.locations') is null then manquantes := manquantes || 'locations, '; end if;
  if to_regclass('public.history')   is null then manquantes := manquantes || 'history, ';   end if;
  if to_regclass('public.projects')  is null then manquantes := manquantes || 'projects, ';  end if;
  if manquantes <> '' then
    raise exception 'Tables manquantes : %. Exécute d''abord les scripts 001 à 004 dans l''ordre.', rtrim(manquantes, ', ');
  end if;
end $$;


-- ------------------------------------------------------------
-- 1. Table des comptes autorisés
-- ------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,
  email       text unique not null,
  name        text default '',
  role        text not null default 'stagiaire',   -- 'admin' | 'stagiaire'
  active      boolean not null default true,
  last_seen   timestamptz,
  created_at  timestamptz default now()
);

-- Un compte inscrit ici est autorisé. Lors de sa première connexion,
-- son identifiant technique est rattaché automatiquement à sa ligne.
create or replace function link_profile_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set user_id = new.id
   where lower(email) = lower(new.email) and user_id is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function link_profile_on_signup();

-- Filet de sécurité : si le rattachement n'a pas eu lieu (compte
-- d'authentification créé avant cette migration, par exemple), l'application
-- appelle cette fonction au moment de la connexion pour se rattacher elle-même.
create or replace function claim_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set user_id = auth.uid()
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
     and user_id is null;
end $$;

grant execute on function claim_profile() to authenticated;


-- ------------------------------------------------------------
-- 2. Fonctions de droits — LE POINT DE CHANGEMENT UNIQUE
--    Pour modifier les permissions d'un rôle, il suffit de modifier
--    la fonction correspondante ci-dessous. Rien d'autre à toucher.
-- ------------------------------------------------------------
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles
   where user_id = auth.uid() and active = true
   limit 1;
$$;

-- Membre du studio (connecté et autorisé) : peut consulter, emprunter, rendre
create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select my_role() is not null;
$$;

-- Administrateur : tous les droits
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select my_role() = 'admin';
$$;

-- ★ Droit de créer / modifier le matériel, les emplacements, les projets.
--   POUR AUTORISER LES STAGIAIRES PLUS TARD :
--   remplacer  in ('admin')  par  in ('admin','stagiaire')  puis Run.
create or replace function can_edit_inventory() returns boolean
language sql stable security definer set search_path = public as $$
  select my_role() in ('admin');
$$;

-- Droit de supprimer (corbeille et purge définitive)
create or replace function can_delete() returns boolean
language sql stable security definer set search_path = public as $$
  select my_role() in ('admin');
$$;


-- ------------------------------------------------------------
-- 3. Garde-fous : ce qu'un non-éditeur peut modifier
--    Un stagiaire peut faire un check-out / check-in / signaler une
--    réparation (statut, emprunt, emplacement, état), mais ne peut pas
--    renommer, reclasser ou supprimer un item.
-- ------------------------------------------------------------
create or replace function guard_items_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if can_edit_inventory() then return new; end if;

  if new.deleted_at is distinct from old.deleted_at and not can_delete() then
    raise exception 'Suppression réservée aux administrateurs';
  end if;

  if new.id     is distinct from old.id
  or new.name   is distinct from old.name
  or new.cat    is distinct from old.cat
  or new.brand  is distinct from old.brand
  or new.serial is distinct from old.serial
  or new.home   is distinct from old.home
  or new.notes  is distinct from old.notes
  or new.photo  is distinct from old.photo then
    raise exception 'Modification de la fiche réservée aux administrateurs';
  end if;

  return new;
end $$;

drop trigger if exists guard_items on items;
create trigger guard_items before update on items
  for each row execute function guard_items_update();

-- Sur les projets : un non-éditeur peut cocher la checklist et changer le
-- statut (préparation / show), mais pas renommer le projet ni changer sa liste.
create or replace function guard_projects_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if can_edit_inventory() then return new; end if;

  if new.name        is distinct from old.name
  or new.description is distinct from old.description
  or new.item_ids::text is distinct from old.item_ids::text then
    raise exception 'Modification du projet réservée aux administrateurs';
  end if;

  return new;
end $$;

do $$
begin
  if to_regclass('public.projects') is not null then
    drop trigger if exists guard_projects on projects;
    create trigger guard_projects before update on projects
      for each row execute function guard_projects_update();
  end if;
end $$;


-- ------------------------------------------------------------
-- 4. Historique signé : qui a effectué l'action
-- ------------------------------------------------------------
alter table history add column if not exists actor_id   uuid;
alter table history add column if not exists actor_name text;


-- ------------------------------------------------------------
-- 5. Règles d'accès (RLS)
--    On retire l'accès anonyme : sans compte autorisé, rien n'est visible.
-- ------------------------------------------------------------
-- 5a. Droits de base : sans cela, tout accès est refusé (erreur 403) avant
--     même que les règles ci-dessous ne s'appliquent. Les règles RLS filtrent
--     ensuite ligne par ligne selon le rôle.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- L'accès anonyme n'a plus lieu d'être : l'application exige une connexion.
revoke all on all tables in schema public from anon;

-- 5b. Activation et règles
alter table profiles enable row level security;

drop policy if exists "anon_all_items"     on items;
drop policy if exists "anon_all_people"    on people;
drop policy if exists "anon_all_locations" on locations;
drop policy if exists "anon_all_history"   on history;
drop policy if exists "anon_all_projects"  on projects;

-- --- profiles : visibles par les membres, gérés par les admins ---
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_write"  on profiles;
create policy "profiles_select" on profiles for select to authenticated
  using (is_member() or user_id = auth.uid());
create policy "profiles_write" on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

-- --- items ---
drop policy if exists "items_select" on items;
drop policy if exists "items_insert" on items;
drop policy if exists "items_update" on items;
drop policy if exists "items_delete" on items;
create policy "items_select" on items for select to authenticated using (is_member());
create policy "items_insert" on items for insert to authenticated with check (can_edit_inventory());
create policy "items_update" on items for update to authenticated
  using (is_member()) with check (is_member());   -- colonnes filtrées par le garde-fou
create policy "items_delete" on items for delete to authenticated using (is_admin());

-- --- people (emprunteurs, sans compte) ---
drop policy if exists "people_select" on people;
drop policy if exists "people_write"  on people;
create policy "people_select" on people for select to authenticated using (is_member());
create policy "people_write"  on people for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

-- --- locations ---
drop policy if exists "locations_select" on locations;
drop policy if exists "locations_write"  on locations;
create policy "locations_select" on locations for select to authenticated using (is_member());
create policy "locations_write"  on locations for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

-- --- projects ---
drop policy if exists "projects_select" on projects;
drop policy if exists "projects_insert" on projects;
drop policy if exists "projects_update" on projects;
drop policy if exists "projects_delete" on projects;
create policy "projects_select" on projects for select to authenticated using (is_member());
create policy "projects_insert" on projects for insert to authenticated with check (can_edit_inventory());
create policy "projects_update" on projects for update to authenticated
  using (is_member()) with check (is_member());   -- colonnes filtrées par le garde-fou
create policy "projects_delete" on projects for delete to authenticated using (can_edit_inventory());

-- --- history : tout le monde écrit son journal, seuls les admins effacent ---
drop policy if exists "history_select" on history;
drop policy if exists "history_insert" on history;
drop policy if exists "history_delete" on history;
create policy "history_select" on history for select to authenticated using (is_member());
create policy "history_insert" on history for insert to authenticated with check (is_member());
create policy "history_delete" on history for delete to authenticated using (is_admin());


-- ------------------------------------------------------------
-- 6. Temps réel sur les profils
-- ------------------------------------------------------------
do $$
begin
  execute 'alter publication supabase_realtime add table profiles';
exception when duplicate_object then null;
end $$;


-- ------------------------------------------------------------
-- 7. Premier administrateur
--    (modifier l'email ci-dessous pour un autre projet / bac à sable)
-- ------------------------------------------------------------
insert into profiles (email, name, role)
values ('maxys@accessflow.fr', 'Maxys', 'admin')
on conflict (email) do update set role = 'admin', active = true;

-- Si le compte s'est déjà connecté avant cette migration, on le rattache :
update profiles p
   set user_id = u.id
  from auth.users u
 where lower(u.email) = lower(p.email) and p.user_id is null;
