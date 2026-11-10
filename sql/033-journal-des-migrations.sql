-- ============================================================
-- 033 — Le journal des migrations
--
-- À COLLER EN ENTIER DANS UN ONGLET NEUF. À PASSER AVANT LA 034.
-- Rejouable sans dommage : elle n'ajoute qu'une table et des lignes.
--
-- ------------------------------------------------------------
-- LE PROBLÈME
--
-- « Quelles migrations sont passées sur ma base ? » n'avait aucune
-- réponse. On la reconstituait de mémoire, ou en interrogeant
-- `information_schema` objet par objet — ce qui a été fait quatre
-- fois en une seule semaine, à chaque fois qu'un doute surgissait.
--
-- C'est le genre de question qu'on ne devrait jamais avoir à poser
-- deux fois.
--
-- ------------------------------------------------------------
-- POURQUOI PAS DES ONGLETS SUPABASE
--
-- Un onglet de l'éditeur SQL est un bloc-notes, pas un registre. Le
-- dossier `sql/` du dépôt est déjà la source de vérité : les
-- fichiers sont numérotés, versionnés, relisibles.
--
-- Tenir en plus une liste d'onglets reviendrait à entretenir un
-- SECOND registre, qui divergerait du premier au premier oubli.
-- C'est exactement le piège qui a rendu les caisses
-- incompréhensibles en v1.20 — deux relations concurrentes, et plus
-- moyen de savoir laquelle fait foi.
--
-- L'habitude d'un onglet neuf par migration reste bonne : elle
-- empêche de recoller une version périmée, ce qui est arrivé lors de
-- la 031. Mais c'est une hygiène de travail, pas une mémoire.
--
-- LA MÉMOIRE, C'EST CETTE TABLE. Elle vit dans la base qu'elle
-- décrit, elle part dans la sauvegarde, et elle répond en une
-- requête.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Le journal
-- ------------------------------------------------------------
create table if not exists public.schema_migrations (
  id         text primary key,          -- « 033 »
  name       text not null,             -- le nom du fichier
  -- VOLONTAIREMENT NULLABLE. Une migration passée avant l'existence
  -- de ce journal n'a pas de date connue, et lui en inventer une
  -- serait pire qu'une case vide : on croirait savoir. Le défaut
  -- couvre le cas normal — une migration qui s'enregistre en
  -- omettant la colonne reçoit l'heure courante.
  --
  -- Ne pas « resserrer » cette colonne en not null : la première
  -- écriture le faisait, et la reprise échouait, parce qu'un défaut
  -- ne s'applique que si la colonne est OMISE, jamais si on lui
  -- passe null explicitement.
  applied_at timestamptz default now(),
  note       text
);

-- Au cas où une première tentative aurait créé la table avec la
-- contrainte : on la retire plutôt que de demander de tout refaire.
alter table public.schema_migrations alter column applied_at drop not null;

comment on table public.schema_migrations is
  'Ce qui a été passé sur cette base, et quand. Le dossier sql/ du '
  'dépôt dit ce qui EXISTE ; cette table dit ce qui est APPLIQUÉ. '
  'Deux questions différentes, deux endroits — mais un seul par '
  'question.';

alter table public.schema_migrations enable row level security;

drop policy if exists "schema_migrations_select" on public.schema_migrations;
create policy "schema_migrations_select" on public.schema_migrations
  for select to authenticated using (is_member());
drop policy if exists "schema_migrations_write" on public.schema_migrations;
create policy "schema_migrations_write" on public.schema_migrations
  for all to authenticated
  using (is_admin()) with check (is_admin());


-- ------------------------------------------------------------
-- 2. Reprise de l'existant
--
--    Les migrations 001 à 032 ont été passées avant que ce journal
--    n'existe. On les enregistre avec une date NULLE plutôt
--    qu'inventée : écrire une fausse date serait pire que de laisser
--    la case vide, et la note dit d'où vient l'information.
--
--    Elles sont toutes appliquées, et ce n'est pas une supposition :
--    l'application ne peut pas tourner en v2.6.0 sans elles. Les
--    tables, colonnes et contraintes qu'elles créent sont lues à
--    chaque chargement.
-- ------------------------------------------------------------
insert into public.schema_migrations (id, name, applied_at, note) values
  ('001','001-init.sql',                      null,'Constaté a posteriori'),
  ('002','002-reparations-sousemplacements.sql', null,'Constaté a posteriori'),
  ('003','003-projets.sql',                   null,'Constaté a posteriori'),
  ('004','004-corbeille.sql',                 null,'Constaté a posteriori'),
  ('005','005-comptes.sql',                   null,'Constaté a posteriori'),
  ('006','006-categories.sql',                null,'Constaté a posteriori'),
  ('007','007-owner-provider-price.sql',      null,'Constaté a posteriori'),
  ('008','008-sales-order-date.sql',          null,'Constaté a posteriori'),
  ('009','009-photos-storage.sql',            null,'Constaté a posteriori'),
  ('010','010-codes-anglais.sql',             null,'Constaté a posteriori'),
  ('011','011-user-prefs.sql',                null,'Constaté a posteriori'),
  ('012','012-lieux-projects.sql',            null,'Constaté a posteriori'),
  ('013','013-adresses.sql',                  null,'Constaté a posteriori'),
  ('014','014-rangement-familles.sql',        null,'Constaté a posteriori'),
  ('015','015-peaux-consommables.sql',        null,'Constaté a posteriori'),
  ('016','016-reparations.sql',               null,'Constaté a posteriori'),
  ('017','017-photos-multiples.sql',          null,'Constaté a posteriori'),
  ('018','018-poids.sql',                     null,'Constaté a posteriori'),
  ('019','019-packs.sql',                     null,'Constaté a posteriori'),
  ('020','020-codes-identifiants.sql',        null,'Constaté a posteriori'),
  ('021','021-packs-simplifies.sql',          null,'Constaté a posteriori'),
  ('022','022-conditionnement.sql',           null,'Constaté a posteriori'),
  ('023','023-conditionnement-detail.sql',    null,'Constaté a posteriori'),
  ('024','024-packs-presets-projets.sql',     null,'Constaté a posteriori'),
  ('025','025-etats-materiel.sql',            null,'Constaté a posteriori'),
  ('026','026-contenants-partages.sql',       null,'Constaté a posteriori'),
  ('027','027-rangements-projet.sql',         null,'Constaté a posteriori — défaite par la 028'),
  ('028','028-rangements-retires.sql',        null,'Constaté a posteriori'),
  ('029','029-besoins-items.sql',             null,'Constaté a posteriori'),
  ('030','030-items-lies.sql',                null,'Constaté a posteriori — largement défaite par la 031'),
  ('031','031-lots-indissociables.sql',       null,'Constaté a posteriori'),
  ('032','032-dossiers-et-retour.sql',        null,'Constaté a posteriori')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 3. Et celle-ci s'enregistre elle-même
--    C'est le geste que chaque migration répétera désormais, en
--    dernière ligne de son fichier.
-- ------------------------------------------------------------
insert into public.schema_migrations (id, name) values
  ('033','033-journal-des-migrations.sql')
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 4. Contrôle de cohérence
--
--    Une migration enregistrée dont les objets ont disparu, ou
--    l'inverse, se voit ici. Quelques sentinelles suffisent : si
--    elles sont là, la chaîne a été suivie.
-- ------------------------------------------------------------
select
  (select count(*) from public.schema_migrations)                as enregistrees,
  case when to_regclass('public.packs')        is not null then 'ok' else '⚠ 019' end as sentinelle_019,
  case when to_regclass('public.repairs')      is not null then 'ok' else '⚠ 016' end as sentinelle_016,
  case when to_regclass('public.item_needs')   is not null then 'ok' else '⚠ 029' end as sentinelle_029,
  case when to_regclass('public.item_link_groups') is not null then 'ok' else '⚠ 031' end as sentinelle_031,
  case when to_regclass('public.pack_folders') is not null then 'ok' else '⚠ 032' end as sentinelle_032;

-- Et la liste, à relire quand le doute revient :
--
-- select id, name, applied_at, note
--   from public.schema_migrations order by id;
