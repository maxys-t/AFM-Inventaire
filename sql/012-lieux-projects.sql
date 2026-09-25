-- ============================================================
-- 012 — Lieux et projets
--
-- locations : un lieu sait désormais ce qu'il est (site, salle,
--             ou adresse extérieure) et peut porter une adresse.
-- projects  : un projet porte sa destination et ses dates, ce qui
--             permet de générer le mail de livraison.
--
-- Les dates restent sur le PROJET et non sur le lieu : le Trianon
-- créé une fois resservira à toutes les dates futures sans qu'on
-- ait à ressaisir son adresse.
--
-- À exécuter dans Supabase → SQL Editor.
-- Sans risque : que des ajouts de colonnes avec valeur par défaut,
-- aucune donnée existante n'est modifiée ni supprimée.
-- ============================================================

-- ---------- Lieux ----------
alter table public.locations add column if not exists kind     text    not null default 'room';
alter table public.locations add column if not exists address  text;
alter table public.locations add column if not exists archived boolean not null default false;

-- Les emplacements de premier niveau déjà en place deviennent des sites.
-- (les sous-emplacements gardent kind = 'room')
update public.locations
   set kind = 'site'
 where parent is null
   and kind = 'room';

-- ---------- Projets ----------
alter table public.projects add column if not exists loc_name  text;
alter table public.projects add column if not exists starts_on date;
alter table public.projects add column if not exists ends_on   date;
alter table public.projects add column if not exists archived  boolean not null default false;

-- ---------- Vérification ----------
-- Doit montrer les sites en 'site' et les sous-emplacements en 'room' :
-- select name, parent, kind, archived from public.locations order by kind, name;
