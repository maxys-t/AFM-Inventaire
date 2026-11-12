-- ============================================================
-- 035 — Un nom d'usage, une garantie, des champs par domaine
--
-- À COLLER EN ENTIER DANS UN ONGLET NEUF. Rejouable sans dommage :
-- trois colonnes facultatives, rien de modifié, rien de supprimé.
--
-- ------------------------------------------------------------
-- 1. items.alias — LE NOM QU'ON EMPLOIE VRAIMENT
--
-- Un item était `brand` + `name`, et `name` tenait lieu de MODÈLE :
-- la fiche affiche « Model : Mac Studio M2 Max 2023 96 Gb ». Le nom
-- d'usage n'avait nulle part où aller.
--
-- Et le problème dépasse l'informatique. Deux machines identiques
-- étaient regroupées en « #1 » et « #2 » : personne ne dit « le Mac
-- Studio numéro 1 », tout le monde dit « le A ». Même chose pour
-- deux Pelicases qu'on appelle « la bleue » et « la grise ».
--
-- L'alias passe donc devant le « #N » automatique : un nom d'usage
-- bat toujours un numéro d'inventaire.
--
-- ------------------------------------------------------------
-- 2. items.warranty_until — CE QUI EXPIRE SANS PRÉVENIR
--
-- Vaut pour un U87 comme pour un Mac Studio. Une date, une alerte au
-- tableau de bord quand l'échéance approche.
--
-- ------------------------------------------------------------
-- 3. items.extra — LES CHAMPS PROPRES À UN DOMAINE
--
-- Un ordinateur a une version d'OS, un nom d'hôte, une adresse MAC.
-- Un micro n'en a pas. Leur donner à chacun une colonne de `items`
-- remplirait la table de vides, et il en faudrait une nouvelle série
-- le jour où l'on voudra suivre les lampes d'un ampli.
--
-- Un jsonb, et les jeux de champs DÉCLARÉS DANS `config.js`, par
-- sous-catégorie. Pas d'écran d'administration pour les définir :
-- `CATS`, `CONDS` et `NEED_PRESETS` se tiennent déjà ainsi, le
-- README dit où les modifier, et un studio de trois personnes ne
-- gagne rien à une interface pour une liste qu'on édite trois fois
-- par an.
--
-- CE QUI N'Y ENTRE PAS, et c'est délibéré : stockage libre, cycles
-- de batterie, date de dernière sauvegarde. Ces valeurs dérivent en
-- permanence et personne ne les saisira — un champ que personne ne
-- met à jour est pire qu'un champ absent, parce qu'il a l'air d'une
-- réponse. C'est exactement ce qui est arrivé aux quarante XLR
-- numérotés.
-- ============================================================

alter table public.items add column if not exists alias          text;
alter table public.items add column if not exists warranty_until date;
alter table public.items add column if not exists extra          jsonb not null default '{}'::jsonb;

alter table public.items drop constraint if exists items_alias_chk;
alter table public.items add constraint items_alias_chk
  check (alias is null or length(btrim(alias)) between 1 and 80);

-- Une chaîne vide n'est pas un alias : c'est l'absence d'alias.
-- Sans ce nettoyage, le titre afficherait un blanc à la place du
-- modèle.
update public.items set alias = null where alias is not null and btrim(alias) = '';

create index if not exists items_alias_idx on public.items (alias)
  where alias is not null;

comment on column public.items.alias is
  'Le nom qu''on emploie — « AccessFlow A », « la Pelicase bleue ». '
  'Affiché en titre, le modèle passant en sous-titre, et prioritaire '
  'sur le « #N » automatique : un nom d''usage bat un numéro.';
comment on column public.items.warranty_until is
  'Fin de garantie ou d''AppleCare. Alerte au tableau de bord quand '
  'l''échéance approche. Vaut pour tout le parc, pas que l''informatique.';
comment on column public.items.extra is
  'Champs propres à une sous-catégorie, déclarés dans config.js '
  '(ITEM_FIELDSETS). N''y mettre que ce qui se DÉCIDE ou se '
  'CARACTÉRISE — jamais une mesure qui dérive, que personne ne '
  'tiendra à jour.';


-- ------------------------------------------------------------
-- 4. Au journal des migrations
-- ------------------------------------------------------------
do $$ begin
  if to_regclass('public.schema_migrations') is not null then
    execute $sql$
      insert into public.schema_migrations (id, name) values
        ('035','035-alias-garantie-champs.sql')
      on conflict (id) do nothing
    $sql$;
  else
    raise notice '035 : journal des migrations absent — passez la 033.';
  end if;
end $$;


-- ============================================================
-- 5. OÙ TU EN ES — tout doit dire « ok »
-- ============================================================
select
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='items' and column_name='alias')
       then 'ok' else '⚠ absente' end                        as colonne_alias,
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='items' and column_name='warranty_until')
       then 'ok' else '⚠ absente' end                        as colonne_garantie,
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='items' and column_name='extra')
       then 'ok' else '⚠ absente' end                        as colonne_extra,
  (select count(*) from public.schema_migrations)            as migrations_enregistrees;
