-- ============================================================
-- 032 — Des dossiers pour les caisses, une adresse de retour
--
-- Deux ajouts nés d'une vraie préparation de date, pas d'une
-- relecture de code. Rien n'est modifié, rien n'est supprimé : deux
-- colonnes facultatives. Le script est rejouable sans dommage.
--
-- ------------------------------------------------------------
-- 1. packs.folder
--
-- Vingt-et-une caisses en une seule liste, c'est une liste qu'on ne
-- lit plus : on la fait défiler en cherchant un nom qu'on connaît
-- déjà. Un dossier n'est pas une catégorie savante, c'est juste un
-- tiroir — « LEASH Touring », « Studio », « Backline ».
--
-- Une colonne texte libre plutôt qu'une table de dossiers avec ses
-- identifiants et ses jointures : un dossier n'a aucune propriété
-- propre, rien à lui attacher, et aucune raison d'exister quand il
-- est vide. Le renommer, c'est renommer un mot ; le supprimer, c'est
-- vider sa dernière caisse. Une table lui donnerait une vie qu'il
-- n'a pas.
--
-- ------------------------------------------------------------
-- 2. projects.return_loc
--
-- L'e-mail de livraison disait où le matériel allait, jamais où le
-- ramener. Par défaut c'est le studio — le lieu racine, là où les
-- items habitent. Cette colonne sert aux exceptions : une date où
-- le camion repart ailleurs.
--
-- Elle porte un NOM de lieu et non une clé étrangère, comme
-- `projects.loc_name` depuis la 012 : les emplacements sont
-- identifiés par leur nom dans toute l'application, et introduire
-- ici une seconde façon de les désigner créerait deux vérités.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Le dossier d'une caisse
-- ------------------------------------------------------------
alter table public.packs add column if not exists folder text;

alter table public.packs drop constraint if exists packs_folder_chk;
alter table public.packs add constraint packs_folder_chk
  check (folder is null or length(btrim(folder)) between 1 and 60);

-- Une chaîne vide n'est pas un dossier : c'est l'absence de dossier.
-- Sans ce nettoyage, l'écran afficherait un tiroir sans nom à côté
-- de « Ungrouped », qui veut dire la même chose.
update public.packs set folder = null where folder is not null and btrim(folder) = '';

create index if not exists packs_folder_idx on public.packs (folder);

comment on column public.packs.folder is
  'Un tiroir, pas une catégorie : « LEASH Touring », « Studio ». '
  'Texte libre — un dossier n''a pas de propriétés, donc pas de table.';

-- ------------------------------------------------------------
-- 2. Où ramener le matériel
-- ------------------------------------------------------------
do $$ begin
  if to_regclass('public.projects') is null then
    raise notice 'Table projects absente — passez la 003 d''abord.';
    return;
  end if;
  execute 'alter table public.projects add column if not exists return_loc text';
end $$;

comment on column public.projects.return_loc is
  'Nom du lieu où ramener le matériel. Nul = le studio, c''est-à-dire '
  'le lieu racine. Un nom, comme projects.loc_name depuis la 012 : '
  'deux façons de désigner un emplacement feraient deux vérités.';

-- ============================================================
-- 3. OÙ TU EN ES
--    Ce tableau s'affiche à la fin. Les deux doivent dire « ok ».
-- ============================================================
select
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='packs' and column_name='folder')
       then 'ok' else '⚠ absente' end as colonne_dossier,
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='projects' and column_name='return_loc')
       then 'ok' else '⚠ absente' end as colonne_retour,
  (select count(*) from public.packs)                          as caisses,
  (select count(distinct folder) from public.packs
    where folder is not null)                                  as dossiers;
