-- ============================================================
-- 036 — Le déclencheur du contenant ne revalide plus ce qui
--       n'a pas changé.
--
-- Le symptôme : supprimer un dossier renvoyait
--   « Un contenant ne peut pas être rangé dans son propre pack »
-- alors que l'on ne touchait pas au contenant.
--
-- La cause : pack_folders a un « on delete set null » sur
-- packs.folder_id. Supprimer un dossier est donc une MISE À JOUR
-- de packs, et packs_container_sane est un déclencheur
-- BEFORE INSERT OR UPDATE sur packs : il se réveille et revalide
-- une règle qui ne concerne pas la colonne modifiée.
--
-- La leçon : un déclencheur de validation qui revérifie une
-- donnée inchangée transforme une incohérence déjà présente en
-- verrou définitif sur toute la ligne — renommer la caisse, la
-- ranger dans un dossier ou cocher « permanent » devenait
-- impossible. Une validation doit porter sur ce que la requête
-- change, rien d'autre.
-- ============================================================

create or replace function pack_container_check()
returns trigger language plpgsql as $$
begin
  -- Rien n'a changé sur le contenant : il n'y a rien à revalider.
  if tg_op = 'UPDATE'
     and new.container_id is not distinct from old.container_id then
    return new;
  end if;

  if new.container_id is not null
     and exists (select 1 from public.pack_items
                  where pack_id = new.id and item_id = new.container_id) then
    raise exception 'Un contenant ne peut pas être rangé dans son propre pack';
  end if;
  return new;
end $$;

-- Deuxième ceinture : le déclencheur ne s'arme plus que si la
-- requête mentionne container_id.
drop trigger if exists packs_container_sane on public.packs;
create trigger packs_container_sane
  before insert or update of container_id on public.packs
  for each row execute function pack_container_check();

-- ------------------------------------------------------------
-- Journal + état des lieux : y a-t-il des caisses réellement
-- fautives, c'est-à-dire dont le contenant figure parmi leurs
-- propres membres ? Si cette liste n'est pas vide, elles sont à
-- corriger à la main dans l'application.
-- ------------------------------------------------------------
insert into public.schema_migrations (id, name, note)
values ('036', '036-declencheur-contenant.sql',
        'pack_container_check ne revalide plus un container_id inchangé')
on conflict (id) do nothing;

select coalesce(string_agg(p.name, ', '), 'aucune') as caisses_fautives
from public.packs p
where p.container_id is not null
  and exists (select 1 from public.pack_items
               where pack_id = p.id and item_id = p.container_id);
