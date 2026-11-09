-- ============================================================
-- 032 — Des dossiers pour les caisses, une adresse de retour
--
-- À COLLER EN ENTIER DANS UN ONGLET NEUF DE L'ÉDITEUR SQL.
-- Rejouable : il regarde ce qui existe avant chaque geste, et se
-- termine par un tableau qui dit où tu en es.
--
-- ------------------------------------------------------------
-- 1. UNE TABLE DE DOSSIERS, ET NON UNE COLONNE TEXTE
--
-- La première écriture de cette migration mettait le nom du dossier
-- dans une colonne de `packs`, en défendant qu'un dossier n'a aucune
-- propriété propre et n'a donc pas besoin d'exister seul.
--
-- Le raisonnement était juste, la prémisse fausse. Un dossier qu'on
-- CRÉE AVANT d'y ranger quoi que ce soit — puis dans lequel on fait
-- glisser des caisses, comme dans un Drive — doit exister vide. Une
-- colonne texte ne sait pas porter un dossier vide : il n'y a aucune
-- ligne pour l'écrire.
--
-- Le geste a changé, donc le modèle change. `pos` permet en prime de
-- ranger les dossiers autrement que par ordre alphabétique, ce
-- qu'une colonne texte n'aurait jamais permis.
--
-- Supprimer un dossier NE SUPPRIME PAS ses caisses : elles
-- remontent au niveau racine (`on delete set null`). C'est ce que
-- fait un gestionnaire de fichiers, et c'est le seul comportement
-- qui ne perde rien par inadvertance.
--
-- ------------------------------------------------------------
-- 2. projects.return_loc
--
-- L'e-mail de livraison disait où le matériel allait, jamais où le
-- ramener. Par défaut c'est le studio — le lieu racine, là où les
-- items habitent. Cette colonne sert aux exceptions.
--
-- Elle porte un NOM de lieu et non une clé étrangère, comme
-- `projects.loc_name` depuis la 012 : les emplacements sont
-- identifiés par leur nom dans toute l'application, et introduire
-- ici une seconde façon de les désigner créerait deux vérités.
--
-- ⚠️ SAUVEGARDE AVANT, comme toujours.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Les dossiers
-- ------------------------------------------------------------
create table if not exists public.pack_folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  pos        integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pack_folders drop constraint if exists pack_folders_name_chk;
alter table public.pack_folders add constraint pack_folders_name_chk
  check (length(btrim(name)) between 1 and 60);

-- Deux dossiers du même nom seraient deux tiroirs qu'on ne sait pas
-- distinguer : l'un des deux recevrait des caisses au hasard.
create unique index if not exists pack_folders_nom_uniq
  on public.pack_folders (lower(btrim(name)));

alter table public.packs add column if not exists folder_id uuid
  references public.pack_folders(id) on delete set null;

create index if not exists packs_folder_idx on public.packs (folder_id);

comment on table public.pack_folders is
  'Des tiroirs pour la liste des caisses : « LEASH Touring », '
  '« Studio ». Une table et non une colonne texte, parce qu''un '
  'dossier se crée VIDE avant qu''on y glisse quoi que ce soit.';
comment on column public.packs.folder_id is
  'Nul = la caisse est à la racine. Supprimer le dossier ramène ses '
  'caisses ici plutôt que de les emporter.';


-- ------------------------------------------------------------
-- 2. Reprise de la colonne texte, si une version antérieure de
--    cette migration l'a créée
--
--    Chaque nom distinct devient un dossier, et les caisses qui le
--    portaient y sont rattachées. Fait en une fois, ici, plutôt
--    qu'avec deux façons concurrentes de ranger une caisse.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='packs'
                    and column_name='folder') then
    raise notice '032 : pas de colonne texte à reprendre.';
    return;
  end if;

  execute $sql$
    insert into public.pack_folders(name)
    select distinct btrim(folder) from public.packs
     where folder is not null and btrim(folder) <> ''
       and not exists (select 1 from public.pack_folders f
                        where lower(f.name) = lower(btrim(packs.folder)))
  $sql$;

  execute $sql$
    update public.packs p
       set folder_id = f.id
      from public.pack_folders f
     where p.folder is not null
       and lower(btrim(p.folder)) = lower(f.name)
       and p.folder_id is null
  $sql$;

  execute 'alter table public.packs drop column folder';
  raise notice '032 : colonne texte reprise puis retirée.';
end $$;


-- ------------------------------------------------------------
-- 3. Où ramener le matériel
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


-- ------------------------------------------------------------
-- 4. Droits
--    Même règle que les packs : un stagiaire consulte, il ne
--    réorganise pas le rangement.
-- ------------------------------------------------------------
alter table public.pack_folders enable row level security;

drop policy if exists "pack_folders_select" on public.pack_folders;
create policy "pack_folders_select" on public.pack_folders
  for select to authenticated using (is_member());
drop policy if exists "pack_folders_write" on public.pack_folders;
create policy "pack_folders_write" on public.pack_folders
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());


-- ============================================================
-- 5. OÙ TU EN ES — tout doit dire « ok »
-- ============================================================
select
  case when to_regclass('public.pack_folders') is not null
       then 'ok' else '⚠ absente' end                          as table_dossiers,
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='packs' and column_name='folder_id')
       then 'ok' else '⚠ absente' end                          as colonne_packs,
  case when not exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='packs' and column_name='folder')
       then 'ok — retirée' else '⚠ encore là' end              as ancienne_colonne,
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='projects' and column_name='return_loc')
       then 'ok' else '⚠ absente' end                          as colonne_retour,
  (select count(*) from public.pack_folders)                   as dossiers,
  (select count(*) from public.packs where folder_id is not null) as caisses_rangees;
