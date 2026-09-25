-- ============================================================
-- 013 — Adresses structurées
--
-- La colonne `address` de la migration 012 était un champ libre.
-- Elle devient cinq champs, pour que le mail de livraison sorte
-- une adresse correctement mise en forme plutôt qu'une ligne.
--
-- L'ancienne colonne `address` est CONSERVÉE et recopiée dans
-- `street`. Elle n'est plus utilisée par l'application, mais reste
-- là une version en filet : si quelque chose s'est mal passé à la
-- recopie, la donnée d'origine est toujours consultable.
-- Elle sera supprimée dans une migration ultérieure.
--
-- À exécuter dans Supabase → SQL Editor. Relançable sans risque.
-- ============================================================

alter table public.locations add column if not exists street   text;
alter table public.locations add column if not exists zip      text;
alter table public.locations add column if not exists city     text;
alter table public.locations add column if not exists extra    text;
alter table public.locations add column if not exists phone    text;

-- Recopie unique : on ne touche pas aux lignes déjà renseignées,
-- pour que relancer le script n'écrase jamais une saisie récente.
update public.locations
   set street = address
 where address is not null
   and address <> ''
   and (street is null or street = '');

-- ---------- Vérification ----------
-- select name, kind, address, street, zip, city, phone
--   from public.locations
--  where address is not null and address <> '';
