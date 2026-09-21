-- ============================================================
-- 008 — N° de commande et date d'achat (v1.5)
-- À exécuter une fois dans Supabase → SQL Editor (éditeur vidé).
-- ============================================================

alter table public.items add column if not exists sales_order   text;
alter table public.items add column if not exists purchase_date date;

-- Ces deux colonnes font partie de la fiche : réservées aux administrateurs.
create or replace function guard_items_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- maintenance SQL / service
  if can_edit_inventory() then return new; end if;

  if new.deleted_at is distinct from old.deleted_at and not can_delete() then
    raise exception 'Suppression réservée aux administrateurs';
  end if;

  if new.id            is distinct from old.id
  or new.name          is distinct from old.name
  or new.cat           is distinct from old.cat
  or new.subcat        is distinct from old.subcat
  or new.brand         is distinct from old.brand
  or new.serial        is distinct from old.serial
  or new.home          is distinct from old.home
  or new.notes         is distinct from old.notes
  or new.photo         is distinct from old.photo
  or new.owner         is distinct from old.owner
  or new.provider      is distinct from old.provider
  or new.price         is distinct from old.price
  or new.sales_order   is distinct from old.sales_order
  or new.purchase_date is distinct from old.purchase_date then
    raise exception 'Modification de la fiche réservée aux administrateurs';
  end if;

  return new;
end $$;

-- Vérification : doit renvoyer 2 lignes
select column_name, data_type from information_schema.columns
 where table_name = 'items' and column_name in ('sales_order','purchase_date');
