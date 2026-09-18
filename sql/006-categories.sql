-- ============================================================
-- Migration 006 — Catégories à deux niveaux
-- À coller dans Supabase > SQL Editor > Run. Ré-exécutable sans danger.
--
-- « cat » devient la catégorie principale, « subcat » la sous-catégorie.
-- Les items existants sont reclassés au plus proche (voir les
-- approximations signalées plus bas, à revoir dans l'application).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Correctif des garde-fous
--    Les modifications lancées depuis l'éditeur SQL (ou par une clé
--    secrète) n'ont pas d'utilisateur connecté : auth.uid() est vide.
--    Sans cette exception, les garde-fous de la migration 005 bloquent
--    toute maintenance en base.
-- ------------------------------------------------------------
create or replace function guard_items_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- maintenance SQL / service
  if can_edit_inventory() then return new; end if;

  if new.deleted_at is distinct from old.deleted_at and not can_delete() then
    raise exception 'Suppression réservée aux administrateurs';
  end if;

  if new.id     is distinct from old.id
  or new.name   is distinct from old.name
  or new.cat    is distinct from old.cat
  or new.subcat is distinct from old.subcat
  or new.brand  is distinct from old.brand
  or new.serial is distinct from old.serial
  or new.home   is distinct from old.home
  or new.notes  is distinct from old.notes
  or new.photo  is distinct from old.photo then
    raise exception 'Modification de la fiche réservée aux administrateurs';
  end if;

  return new;
end $$;

create or replace function guard_projects_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- maintenance SQL / service
  if can_edit_inventory() then return new; end if;

  if new.name        is distinct from old.name
  or new.description is distinct from old.description
  or new.item_ids::text is distinct from old.item_ids::text then
    raise exception 'Modification du projet réservée aux administrateurs';
  end if;

  return new;
end $$;


alter table items add column if not exists subcat text;

-- Reclassement des anciennes catégories (une seule fois : ne touche
-- que les items dont la sous-catégorie n'est pas encore renseignée)
update items set cat='instruments',   subcat='synthe'       where subcat is null and cat='synthe';
update items set cat='instruments',   subcat='boite'        where subcat is null and cat='boite';
update items set cat='instruments',   subcat='autre_inst'   where subcat is null and cat='instrument';
update items set cat='captation',     subcat='dynamique'    where subcat is null and cat='micro';       -- ⚠️ à revoir (condensateur / ruban ?)
update items set cat='peripheriques', subcat='effets'       where subcat is null and cat='effet';
update items set cat='pedales',       subcat='multi'        where subcat is null and cat='pedale';      -- ⚠️ à revoir (type d'effet)
update items set cat='amplification', subcat='ampli_inst'   where subcat is null and cat='ampli';
update items set cat='amplification', subcat='monitoring'   where subcat is null and cat='enceinte';
update items set cat='amplification', subcat='casque'       where subcat is null and cat='casque';
update items set cat='informatique',  subcat='interface'    where subcat is null and cat='interface';
update items set cat='cablage',       subcat='xlr'          where subcat is null and cat='cable';       -- ⚠️ à revoir (jack / secteur ?)
update items set cat='supports',      subcat='pied'         where subcat is null and cat='pied';
update items set cat='divers',        subcat='autre'        where subcat is null and cat='accessoire';
update items set cat='divers',        subcat='autre'        where subcat is null and cat='autre';

-- Filet : tout item encore sans sous-catégorie part dans « Divers »
update items set cat='divers', subcat='autre' where subcat is null;

-- Les deux niveaux sont désormais obligatoires
alter table items alter column subcat set not null;

-- Contrôle : combien d'items par catégorie après reclassement
select cat, subcat, count(*) from items group by cat, subcat order by cat, subcat;
