-- ============================================================
-- 034 — Trois niveaux de matériel
--
-- À COLLER EN ENTIER DANS UN ONGLET NEUF DE L'ÉDITEUR SQL.
-- La 033 (journal des migrations) doit être passée avant.
-- Rejouable : elle regarde ce qui existe avant chaque geste, et se
-- termine par un tableau qui dit où tu en es.
--
-- ------------------------------------------------------------
-- LE PROBLÈME
--
-- Une date préparée pour de vrai, et un départ sans checklist fiable
-- — l'approximation portait sur les câbles de rab.
--
-- Ce n'était ni une négligence ni une fonction manquante, mais une
-- conséquence du modèle : chaque câble était un ITEM, avec son
-- identifiant, sa fiche, son historique. Personne ne tient à jour
-- quarante XLR numérotés un par un. La donnée dérive, la checklist
-- devient incroyable, on pack à l'œil.
--
-- Un XLR était au même rang qu'un Minimoog.
--
-- ------------------------------------------------------------
-- TROIS NIVEAUX, ET CE QUI LES SÉPARE
--
--   ITEM          suivi individuellement, fiche, historique, revient
--                 → un Minimoog, un U87, une Pelicase
--   ACCESSOIRE    compté, pas de fiche par exemplaire, revient
--                 → un XLR 3 m, un adaptateur de pas de vis
--   CONSOMMABLE   compté, et ne revient pas
--                 → une peau de batterie, du gaffer, des piles
--
-- Accessoires et consommables partagent la même table : ils ne
-- diffèrent que par le RETOUR, et deux tables presque identiques
-- auraient produit deux fois le même écran. C'est la leçon de la
-- v1.20, où deux relations concurrentes avaient rendu les caisses
-- incompréhensibles.
--
-- ------------------------------------------------------------
-- CE QUI REND UNE CHECKLIST DÉFINITIVE
--
-- « XLR 3 m × 12 » n'est un fait que si l'application sait qu'on en
-- possède 40, qu'un est hors service, et qu'il en reste 23
-- d'utilisables au studio. Sans ces chiffres, c'est un vœu.
--
-- D'où `qty_total` ET `qty_hs` : décrémenter purement ferait baisser
-- la valeur d'achat du parc alors que l'objet est encore là, et
-- surtout effacerait la trace de ce qu'il y a à réparer ou à jeter.
--
-- ⚠️ SAUVEGARDE AVANT. Cette migration reprend les consommables de
-- caisse existants puis supprime la table qui les portait.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Les accessoires et les consommables
-- ------------------------------------------------------------
create table if not exists public.supplies (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'accessory',
  name       text not null,
  brand      text default '',
  cat        text,              -- même taxonomie que les items
  subcat     text,
  qty_total  integer not null default 0,
  qty_hs     integer not null default 0,   -- hors service, encore là
  min_qty    integer,                      -- seuil d'alerte
  weight_g   integer,                      -- unitaire
  loc        text,                         -- où vit le stock
  photo      text,
  provider   text default '',
  price      numeric,                      -- unitaire
  notes      text default '',
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.supplies drop constraint if exists supplies_kind_chk;
alter table public.supplies add constraint supplies_kind_chk
  check (kind in ('accessory','consumable'));

alter table public.supplies drop constraint if exists supplies_name_chk;
alter table public.supplies add constraint supplies_name_chk
  check (length(btrim(name)) between 1 and 120);

-- On peut posséder zéro exemplaire — un consommable épuisé reste une
-- ligne, sinon on oublierait d'en racheter. Mais pas un nombre
-- négatif, et pas plus de hors service que de possédés.
alter table public.supplies drop constraint if exists supplies_qty_chk;
alter table public.supplies add constraint supplies_qty_chk
  check (qty_total >= 0 and qty_total <= 99999
     and qty_hs >= 0 and qty_hs <= qty_total);

alter table public.supplies drop constraint if exists supplies_min_chk;
alter table public.supplies add constraint supplies_min_chk
  check (min_qty is null or (min_qty >= 0 and min_qty <= 99999));

alter table public.supplies drop constraint if exists supplies_weight_chk;
alter table public.supplies add constraint supplies_weight_chk
  check (weight_g is null or (weight_g > 0 and weight_g <= 500000));

create index if not exists supplies_kind_idx on public.supplies (kind, archived);

comment on table public.supplies is
  'Ce qui se compte au lieu de se suivre à l''unité. kind=accessory : '
  'revient (câbles, adaptateurs). kind=consumable : ne revient pas '
  '(peaux, gaffer, piles). Même table, parce qu''ils ne diffèrent que '
  'par le retour.';
comment on column public.supplies.qty_hs is
  'Hors service mais encore là. Décrémenter qty_total ferait baisser '
  'la valeur du parc alors que l''objet existe, et effacerait la '
  'trace de ce qu''il y a à réparer.';


-- ------------------------------------------------------------
-- 2. La dotation d'une caisse
--
--    « La malle câbles contient toujours 12 XLR 3 m. » Écrit une
--    fois, part avec elle.
--
--    Un seul rattachement : à une CAISSE. Un appoint par projet a
--    été envisagé puis écarté — les spares de la dernière date
--    n'étaient pas mal comptés, ils n'étaient pas sur la liste du
--    tout, et une dotation fixe les y met. Deux endroits où déclarer
--    ce qui part coûteraient plus en confusion qu'ils ne
--    rapporteraient en souplesse (leçon de la v1.29).
-- ------------------------------------------------------------
create table if not exists public.supply_lines (
  id         uuid primary key default gen_random_uuid(),
  supply_id  uuid not null references public.supplies(id) on delete cascade,
  pack_id    uuid not null references public.packs(id)    on delete cascade,
  qty        integer not null default 1,
  -- Un « spare » n'est pas un concept : c'est une ligne comme une
  -- autre, avec une case qui ne change que le sous-titre sous lequel
  -- elle s'affiche. Son utilité est de lecture — au chargement, on
  -- sait quelles lignes on peut sacrifier si la place manque.
  spare      boolean not null default false,
  pos        integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.supply_lines drop constraint if exists supply_lines_qty_chk;
alter table public.supply_lines add constraint supply_lines_qty_chk
  check (qty > 0 and qty <= 9999);

-- Une même fourniture peut figurer deux fois dans une caisse : douze
-- XLR de service et quatre de rab. Mais pas deux fois dans le même
-- rôle, sinon l'objet apparaîtrait en double sur la checklist.
drop index if exists public.supply_lines_uniq;
create unique index supply_lines_uniq
  on public.supply_lines (pack_id, supply_id, spare);

create index if not exists supply_lines_pack_idx on public.supply_lines (pack_id, pos);


-- ------------------------------------------------------------
-- 3. Les items archivés
--
--    La bascule d'un câble en accessoire n'EFFACE pas les items :
--    elle les archive. Leur historique reste lisible, et une bascule
--    ratée se défait.
--
--    Surtout, ce n'est PAS la corbeille : celle-ci marque « expiré »
--    au bout de trente jours, et cent soixante-dix câbles y
--    deviendraient un bruit permanent qu'on finirait par vider sans
--    regarder.
-- ------------------------------------------------------------
alter table public.items add column if not exists archived boolean not null default false;
create index if not exists items_archived_idx on public.items (archived);

comment on column public.items.archived is
  'Retiré du parc courant sans être supprimé — typiquement un item '
  'basculé en accessoire compté. Distinct de la corbeille '
  '(deleted_at), qui expire au bout de 30 jours.';


-- ------------------------------------------------------------
-- 4. Reprise des consommables de caisse (v1.22)
--
--    `pack_extras` portait un libellé et une quantité, accrochés à
--    une caisse, sans stock ni existence propre. Chaque libellé
--    distinct devient une ligne de `supplies`, et chaque ligne de
--    `pack_extras` une dotation.
--
--    Tout part en `consumable`, y compris ce qui ressemble à un
--    accessoire — « Midi Din 5 Cable », « USB C PSU ». On NE DEVINE
--    PAS : le comportement actuel est préservé à l'identique, et
--    l'écran permettra de requalifier d'un clic. Deviner ici
--    reviendrait à modifier des données sans que personne l'ait
--    demandé.
--
--    `qty_total` part à zéro : on ne sait pas combien le studio en
--    possède, et inventer un chiffre serait pire que de laisser la
--    question visible.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.pack_extras') is null then
    raise notice '033 : pas de consommables à reprendre.';
    return;
  end if;

  execute $sql$
    insert into public.supplies (kind, name, notes)
    select distinct 'consumable', btrim(e.label),
           'Repris des consommables de caisse (v1.22). Stock à renseigner.'
      from public.pack_extras e
     where btrim(e.label) <> ''
       and not exists (select 1 from public.supplies s
                        where lower(s.name) = lower(btrim(e.label)))
  $sql$;

  execute $sql$
    insert into public.supply_lines (supply_id, pack_id, qty, pos)
    select s.id, e.pack_id, greatest(e.qty, 1), coalesce(e.pos, 0)
      from public.pack_extras e
      join public.supplies s on lower(s.name) = lower(btrim(e.label))
     where btrim(e.label) <> ''
     on conflict (pack_id, supply_id, spare) do nothing
  $sql$;

  execute 'drop table public.pack_extras';
  raise notice '033 : consommables repris, pack_extras retirée.';
end $$;


-- ------------------------------------------------------------
-- 5. Droits
--    Même règle que partout : un stagiaire coche une préparation, il
--    ne redéfinit pas le stock du studio.
-- ------------------------------------------------------------
alter table public.supplies     enable row level security;
alter table public.supply_lines enable row level security;

drop policy if exists "supplies_select" on public.supplies;
create policy "supplies_select" on public.supplies
  for select to authenticated using (is_member());
drop policy if exists "supplies_write" on public.supplies;
create policy "supplies_write" on public.supplies
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

drop policy if exists "supply_lines_select" on public.supply_lines;
create policy "supply_lines_select" on public.supply_lines
  for select to authenticated using (is_member());
drop policy if exists "supply_lines_write" on public.supply_lines;
create policy "supply_lines_write" on public.supply_lines
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());


-- ------------------------------------------------------------
-- 6. Au journal
--    Chaque migration s'enregistre désormais elle-même (voir la
--    033). Le garde permet de passer ce fichier sur une base où le
--    journal n'existe pas encore, sans échouer pour autant.
-- ------------------------------------------------------------
do $$ begin
  if to_regclass('public.schema_migrations') is not null then
    execute $sql$
      insert into public.schema_migrations (id, name) values
        ('034','034-accessoires-consommables.sql')
      on conflict (id) do nothing
    $sql$;
  else
    raise notice '034 : journal des migrations absent — passez la 033.';
  end if;
end $$;


-- ============================================================
-- 7. OÙ TU EN ES — tout doit dire « ok »
-- ============================================================
select
  case when to_regclass('public.supplies') is not null
       then 'ok' else '⚠ absente' end                             as table_fournitures,
  case when to_regclass('public.supply_lines') is not null
       then 'ok' else '⚠ absente' end                             as table_dotations,
  case when to_regclass('public.pack_extras') is null
       then 'ok — reprise' else '⚠ encore là' end                 as anciens_consommables,
  case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='items' and column_name='archived')
       then 'ok' else '⚠ absente' end                             as items_archived,
  (select count(*) from public.supplies where kind='consumable')  as consommables,
  (select count(*) from public.supplies where kind='accessory')   as accessoires,
  (select count(*) from public.supply_lines)                      as dotations;
