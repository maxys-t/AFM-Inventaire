-- ============================================================
-- 029 — Ce dont un item a besoin pour fonctionner
--
-- LE PROBLÈME
--
-- Le Minimoog ne part jamais seul : il lui faut son bloc d'alim et
-- une Schuko. Rien dans l'application ne le disait. On le savait par
-- cœur, jusqu'au jour où quelqu'un d'autre fait la caisse.
--
-- CE QU'ON A ÉCARTÉ, ET POURQUOI
--
-- La réponse évidente était de faire de chaque alimentation un item
-- de l'inventaire. On l'a écartée : elle doublait presque le nombre
-- d'items pour n'apprendre rien de neuf.
--
-- Un item existe pour répondre à deux questions : « où est-il ? » et
-- « dans quel état ? ». Un bloc d'alim attitré ne les pose pas, et
-- pour une raison précise : IL NE PEUT PAS ÊTRE EN CONFLIT. Le PSU du
-- Minimoog suit le Minimoog, et le Minimoog ne peut être qu'à un seul
-- endroit à la fois. Le conflit de disponibilité est donc déjà
-- attrapé par l'appareil qu'il sert. Lui donner un identifiant, une
-- fiche, un historique et une ligne dans `pack_items` coûterait cher
-- et ne dirait rien de plus.
--
-- CE QU'ON FAIT À LA PLACE
--
-- Un besoin est une DÉCLARATION PORTÉE PAR L'ITEM, pas un objet. Il
-- ne vit dans aucune caisse et dans aucun projet : il est DÉRIVÉ de
-- l'appartenance de l'item. Conséquence directe, et c'est tout
-- l'intérêt du choix : ajouter le Minimoog à une caisse fait
-- apparaître son alim, l'en retirer la fait disparaître, et il n'y a
-- jamais rien à synchroniser. Pas de ligne orpheline possible.
--
-- Deux colonnes méritent un mot.
--
--   weight_g — facultatif. Un transformateur de 1,5 kg compte quand
--     on parle à un transporteur ; un cordon C13 non. C'est ce qui
--     distingue un besoin d'un consommable : le gaffer de la 024 est
--     volontairement sans poids, parce qu'on ne pèse pas du scotch.
--     Une alimentation, si.
--
--   needs_item_id — l'échappatoire. Une alimentation PARTAGÉE entre
--     deux appareils peut, elle, être en conflit : si les deux
--     partent le même soir, il en manque une. Là, et là seulement, il
--     faut un vrai item. La colonne existe pour ce cas rare ; par
--     défaut on ne s'en sert pas.
--
-- ⚠️ SAUVEGARDE AVANT, comme toujours. Cette migration n'ajoute que
-- du neuf : aucune table existante n'est modifiée, aucune donnée
-- touchée. Elle est rejouable sans dommage.
-- ============================================================

-- ------------------------------------------------------------
-- 1. La table
-- ------------------------------------------------------------
create table if not exists public.item_needs (
  id            uuid primary key default gen_random_uuid(),
  item_id       text not null references public.items(id)
                on update cascade on delete cascade,
  -- Deux familles suffisent aujourd'hui. En ajouter une se fait en
  -- une ligne ; en inventer six d'avance se paierait en menus
  -- déroulants que personne ne lit.
  kind          text not null default 'power',
  label         text,
  -- Rempli uniquement pour une alimentation partagée, suivie comme
  -- un vrai item. Nul dans l'immense majorité des cas.
  needs_item_id text references public.items(id)
                on update cascade on delete set null,
  qty           integer not null default 1,
  weight_g      integer,
  pos           integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.item_needs drop constraint if exists item_needs_kind_chk;
alter table public.item_needs add constraint item_needs_kind_chk
  check (kind in ('power','cable'));

alter table public.item_needs drop constraint if exists item_needs_qty_chk;
alter table public.item_needs add constraint item_needs_qty_chk
  check (qty > 0 and qty <= 9999);

alter table public.item_needs drop constraint if exists item_needs_weight_chk;
alter table public.item_needs add constraint item_needs_weight_chk
  check (weight_g is null or (weight_g > 0 and weight_g <= 500000));

-- Un besoin désigne SOIT un libellé libre, SOIT un item suivi. Jamais
-- les deux, jamais aucun : une ligne sans désignation serait une
-- case à cocher vide sur la checklist, et personne ne saurait quoi en
-- faire.
alter table public.item_needs drop constraint if exists item_needs_cible_chk;
alter table public.item_needs add constraint item_needs_cible_chk
  check ( (label is not null and length(btrim(label)) between 1 and 120
           and needs_item_id is null)
       or (label is null and needs_item_id is not null) );

-- Un item ne peut pas avoir besoin de lui-même. La contrainte paraît
-- théorique ; elle ne l'est pas, parce que la liste de choix propose
-- l'inventaire entier.
alter table public.item_needs drop constraint if exists item_needs_pas_soi_chk;
alter table public.item_needs add constraint item_needs_pas_soi_chk
  check (needs_item_id is null or needs_item_id <> item_id);

create index if not exists item_needs_item_idx on public.item_needs (item_id, kind, pos);
create index if not exists item_needs_cible_idx on public.item_needs (needs_item_id)
  where needs_item_id is not null;

comment on table public.item_needs is
  'Ce qu''il faut emporter AVEC un item : alimentations, cordons. '
  'Des déclarations dérivées, pas des objets : elles suivent l''item '
  'dans toutes les caisses et tous les projets sans y être inscrites.';
comment on column public.item_needs.weight_g is
  'Facultatif, en grammes. Rempli pour un transformateur qui pèse, '
  'laissé vide pour un cordon. Compte dans le total d''un transport.';
comment on column public.item_needs.needs_item_id is
  'Réservé à une alimentation PARTAGÉE, qui peut manquer parce que '
  'deux appareils la réclament le même soir. Nul par défaut.';

-- ------------------------------------------------------------
-- 2. Droits
--    Même règle que les consommables de la 024 : un stagiaire coche
--    une préparation, il ne redéfinit pas ce dont un appareil a
--    besoin. Cette déclaration-là est du même ordre qu'une recette.
-- ------------------------------------------------------------
alter table public.item_needs enable row level security;

drop policy if exists "item_needs_select" on public.item_needs;
create policy "item_needs_select" on public.item_needs
  for select to authenticated using (is_member());

drop policy if exists "item_needs_write" on public.item_needs;
create policy "item_needs_write" on public.item_needs
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

-- ------------------------------------------------------------
-- 3. Vérification
--    À copier dans l'éditeur SQL de Supabase après la migration.
--    Attendu : la table, ses cinq contraintes, et deux politiques.
-- ------------------------------------------------------------
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_name = 'item_needs' order by ordinal_position;
--
-- select conname from pg_constraint
--  where conrelid = 'public.item_needs'::regclass and contype = 'c';
--
-- select policyname from pg_policies where tablename = 'item_needs';
