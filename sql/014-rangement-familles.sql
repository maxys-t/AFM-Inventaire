-- ============================================================
-- 014 — Rangement des familles et éclatement des supports
--
--   1. les peaux de batterie rejoignent la famille Consumables
--      (leur CODE ne change pas : leurs identifiants non plus)
--   2. les 59 items rangés sous « Stand » sont répartis en six
--      sous-catégories et RENUMÉROTÉS
--   3. les sous-catégories vides et inutiles disparaissent
--
-- ⚠️ DÉCLENCHER UNE SAUVEGARDE MANUELLE AVANT DE LANCER.
--    Dépôt de sauvegarde → onglet Actions → Run workflow.
--
-- Transactionnel : à la moindre erreur, TOUT est annulé, y compris
-- la désactivation temporaire des garde-fous.
-- Correspondances établies sur l'export du 30/09 : 59 items, 0 collision.
-- ============================================================

begin;

-- ---------- 0. Neutraliser les garde-fous ----------
-- `guard_items` interdit de modifier l'identifiant ou la catégorie d'un item
-- à qui n'est pas administrateur CONNECTÉ. Dans l'éditeur SQL il n'y a pas
-- de session utilisateur, donc il refuserait la migration.
-- Ces instructions étant DANS la transaction, un rollback les annule aussi :
-- la base n'est jamais laissée sans protection.
alter table public.items disable trigger guard_items;
do $$ begin
  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects disable trigger guard_projects';
  end if;
exception when others then null;
end $$;

-- ---------- 1. Table de correspondance ----------
-- Une table plutôt que 118 instructions écrites à la main : les jointures
-- garantissent que l'historique et les projets suivent exactement les mêmes
-- correspondances que les items.
create temporary table _map(
  old    text primary key,
  new    text not null,
  subkey text not null,
  fam    text not null
) on commit drop;

insert into _map(old, new, subkey, fam) values
  ('STD-022', 'CLP-001', 'adaptateur_stand', 'supports'),
  ('STD-023', 'CLP-002', 'adaptateur_stand', 'supports'),
  ('STD-024', 'CLP-003', 'adaptateur_stand', 'supports'),
  ('STD-025', 'CLP-004', 'adaptateur_stand', 'supports'),
  ('STD-026', 'CLP-005', 'adaptateur_stand', 'supports'),
  ('STD-027', 'CLP-006', 'adaptateur_stand', 'supports'),
  ('STD-028', 'CLP-007', 'adaptateur_stand', 'supports'),
  ('STD-029', 'CLP-008', 'adaptateur_stand', 'supports'),
  ('STD-030', 'CLP-009', 'adaptateur_stand', 'supports'),
  ('STD-031', 'CLP-010', 'adaptateur_stand', 'supports'),
  ('STD-032', 'CLP-011', 'adaptateur_stand', 'supports'),
  ('STD-033', 'CLP-012', 'adaptateur_stand', 'supports'),
  ('STD-034', 'CLP-013', 'adaptateur_stand', 'supports'),
  ('STD-035', 'CLP-014', 'adaptateur_stand', 'supports'),
  ('STD-036', 'CLP-015', 'adaptateur_stand', 'supports'),
  ('STD-037', 'CLP-016', 'adaptateur_stand', 'supports'),
  ('STD-038', 'CLP-017', 'adaptateur_stand', 'supports'),
  ('STD-039', 'CLP-018', 'adaptateur_stand', 'supports'),
  ('STD-050', 'CLP-019', 'adaptateur_stand', 'supports'),
  ('STD-013', 'CLP-020', 'adaptateur_stand', 'supports'),
  ('STD-010', 'EXT-001', 'extension_stand', 'supports'),
  ('STD-040', 'EXT-002', 'extension_stand', 'supports'),
  ('STD-041', 'EXT-003', 'extension_stand', 'supports'),
  ('STD-042', 'EXT-004', 'extension_stand', 'supports'),
  ('STD-043', 'EXT-005', 'extension_stand', 'supports'),
  ('STD-044', 'EXT-006', 'extension_stand', 'supports'),
  ('STD-045', 'EXT-007', 'extension_stand', 'supports'),
  ('STD-046', 'EXT-008', 'extension_stand', 'supports'),
  ('STD-047', 'EXT-009', 'extension_stand', 'supports'),
  ('STD-003', 'KST-001', 'stand_clavier', 'supports'),
  ('STD-004', 'KST-002', 'stand_clavier', 'supports'),
  ('STD-005', 'KST-003', 'stand_clavier', 'supports'),
  ('STD-006', 'KST-004', 'stand_clavier', 'supports'),
  ('STD-015', 'KST-005', 'stand_clavier', 'supports'),
  ('STD-007', 'KST-006', 'stand_clavier', 'supports'),
  ('STD-008', 'KST-007', 'stand_clavier', 'supports'),
  ('STD-017', 'KST-008', 'stand_clavier', 'supports'),
  ('STD-018', 'KST-009', 'stand_clavier', 'supports'),
  ('STD-019', 'KST-010', 'stand_clavier', 'supports'),
  ('STD-020', 'KST-011', 'stand_clavier', 'supports'),
  ('STD-021', 'KST-012', 'stand_clavier', 'supports'),
  ('STD-059', 'KST-013', 'stand_clavier', 'supports'),
  ('STD-048', 'MST-017', 'pied', 'supports'),
  ('STD-049', 'MST-018', 'pied', 'supports'),
  ('STD-001', 'MST-019', 'pied', 'supports'),
  ('STD-002', 'MST-020', 'pied', 'supports'),
  ('STD-016', 'RCK-001', 'rack19', 'divers'),
  ('STD-051', 'SST-001', 'stand_enceinte', 'supports'),
  ('STD-052', 'SST-002', 'stand_enceinte', 'supports'),
  ('STD-053', 'SST-003', 'stand_enceinte', 'supports'),
  ('STD-054', 'SST-004', 'stand_enceinte', 'supports'),
  ('STD-011', 'SST-005', 'stand_enceinte', 'supports'),
  ('STD-012', 'SST-006', 'stand_enceinte', 'supports'),
  ('STD-009', 'TRY-001', 'plateau', 'supports'),
  ('STD-055', 'TRY-002', 'plateau', 'supports'),
  ('STD-056', 'TRY-003', 'plateau', 'supports'),
  ('STD-057', 'TRY-004', 'plateau', 'supports'),
  ('STD-058', 'TRY-005', 'plateau', 'supports'),
  ('STD-014', 'TRY-006', 'plateau', 'supports');

-- ---------- 2. Contrôles AVANT d'écrire quoi que ce soit ----------
do $$ declare n int; begin
  select count(*) into n from _map;
  if n <> 59 then raise exception 'Correspondance incomplète : % lignes au lieu de 59', n; end if;

  select count(*) into n from _map m join public.items i on i.id = m.new;
  if n > 0 then raise exception '% nouvel(s) identifiant(s) déjà pris — annulation', n; end if;

  select count(*) into n from public.items
   where subcat = 'stand' and id not in (select old from _map);
  if n > 0 then raise exception '% item(s) en sous-catégorie stand hors correspondance', n; end if;

  select count(*) into n from _map m
   where not exists (select 1 from public.items i where i.id = m.old);
  if n > 0 then raise exception '% correspondance(s) pointent vers un item inexistant', n; end if;
end $$;

-- ---------- 3. Peaux de batterie → Consumables ----------
-- Seule la famille change. Sous-catégorie, code et identifiant restent
-- identiques : les QR codes déjà imprimés restent valables.
update public.items set cat = 'consommables'
 where subcat in ('peau12','peau14','peau16','peau22','peau_autre');

-- ---------- 4. Renumérotation, en deux temps ----------
-- On préfixe d'abord par « ~ » pour qu'aucun nouvel identifiant n'entre en
-- collision avec un ancien encore en place.
update public.items set id = '~' || id where subcat = 'stand';
update public.history set item_id = '~' || item_id
 where item_id in (select old from _map);

update public.items i
   set id = m.new, subcat = m.subkey, cat = m.fam
  from _map m where i.id = '~' || m.old;

update public.history h
   set item_id = m.new
  from _map m where h.item_id = '~' || m.old;

-- ---------- 5. Listes de matériel des projets ----------
-- item_ids et prep sont du JSONB : un tableau et un objet, pas des
-- tableaux Postgres. On les reconstruit élément par élément en
-- préservant l'ordre d'origine.
do $$ begin
  if to_regclass('public.projects') is null then return; end if;

  update public.projects p
     set item_ids = coalesce((
           select jsonb_agg(coalesce(m.new, e.val) order by e.ord)
             from jsonb_array_elements_text(p.item_ids) with ordinality as e(val, ord)
             left join _map m on m.old = e.val), '[]'::jsonb)
   where p.item_ids is not null and jsonb_typeof(p.item_ids) = 'array';

  update public.projects p
     set prep = coalesce((
           select jsonb_object_agg(coalesce(m.new, e.key), e.value)
             from jsonb_each(p.prep) as e(key, value)
             left join _map m on m.old = e.key), '{}'::jsonb)
   where p.prep is not null and jsonb_typeof(p.prep) = 'object'
     and p.prep <> '{}'::jsonb;
end $$;

-- ---------- 6. Contrôles avant validation ----------
do $$ declare n int; begin
  select count(*) into n from public.items where id like '~%';
  if n > 0 then raise exception 'Il reste % identifiant(s) en ~ — annulation', n; end if;

  select count(*) into n from public.history where item_id like '~%';
  if n > 0 then raise exception 'Il reste % ligne(s) d''historique en ~ — annulation', n; end if;

  select count(*) into n from public.items where subcat = 'stand';
  if n > 0 then raise exception '% item(s) encore en sous-catégorie stand', n; end if;

  select count(*) into n from _map m
   where not exists (select 1 from public.items i where i.id = m.new);
  if n > 0 then raise exception '% item(s) introuvable(s) après renumérotation', n; end if;
end $$;

-- ---------- 7. Remise en place des garde-fous ----------
alter table public.items enable trigger guard_items;
do $$ begin
  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects enable trigger guard_projects';
  end if;
exception when others then null;
end $$;

do $$ declare e char; begin
  select tgenabled into e from pg_trigger
   where tgname = 'guard_items' and tgrelid = 'public.items'::regclass;
  if e is distinct from 'O' then
    raise exception 'guard_items n''a pas été réactivé (état %) — annulation', e;
  end if;
end $$;

commit;

-- ---------- Vérifications après coup ----------
-- Répartition des 59 items, doit donner 7 lignes :
--   select subcat, count(*) from items
--    where subcat in ('pied','stand_clavier','stand_enceinte','extension_stand',
--                     'adaptateur_stand','plateau','rack19')
--    group by subcat order by subcat;
--
-- Les 16 peaux, toutes en famille consommables :
--   select cat, count(*) from items where subcat like 'peau%' group by cat;
--
-- Total inchangé, doit renvoyer 648 :
--   select count(*) from items where deleted_at is null;
