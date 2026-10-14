-- ============================================================
-- 015 — Les peaux de batterie deviennent une sous-catégorie
--
-- Les cinq tailles (H12, H14, H16, H22, HDX) fusionnent en une
-- seule sous-catégorie d'Instruments : « Instrument consumables ».
-- La taille reste lisible : elle figure dans le nom de chaque item.
--
-- La famille Consumables est CONSERVÉE, vide, pour les consommables
-- qui ne se rattachent à aucune famille d'instruments.
--
-- ⚠️ 16 items changent d'identifiant. SAUVEGARDE MANUELLE AVANT.
-- ============================================================

begin;

alter table public.items disable trigger guard_items;
do $$ begin
  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects disable trigger guard_projects';
  end if;
exception when others then null;
end $$;

create temporary table _map(old text primary key, new text not null) on commit drop;
insert into _map(old, new) values
  ('H12-001', 'ICS-001'),
  ('H12-002', 'ICS-002'),
  ('H12-003', 'ICS-003'),
  ('H14-001', 'ICS-004'),
  ('H14-002', 'ICS-005'),
  ('H14-003', 'ICS-006'),
  ('H14-004', 'ICS-007'),
  ('H14-005', 'ICS-008'),
  ('H14-006', 'ICS-009'),
  ('H16-001', 'ICS-010'),
  ('H16-002', 'ICS-011'),
  ('H16-003', 'ICS-012'),
  ('H22-001', 'ICS-013'),
  ('H22-002', 'ICS-014'),
  ('H22-003', 'ICS-015'),
  ('HDX-001', 'ICS-016');

/* Mêmes quatre états que la 014 : à migrer, base vierge, déjà
   migrée, ou à moitié passée — seul le dernier est anormal. */
create temporary table _etat on commit drop as
  select (select count(*) from _map m join public.items i on i.id = m.old)::int as ancien,
         (select count(*) from _map m join public.items i on i.id = m.new)::int as nouveau;

-- Contrôles avant toute écriture
do $$ declare n int; anc int; nouv int; begin
  select count(*) into n from _map;
  if n <> 16 then raise exception 'Correspondance incomplète : % lignes', n; end if;

  select e.ancien, e.nouveau into anc, nouv from _etat e;

  if anc = 0 and nouv = 0 then
    raise notice 'Base vierge : aucune peau à reclasser.';
    return;
  end if;
  if anc = 0 and nouv = 16 then
    raise notice 'Déjà reclassées : rejeu sans effet.';
    return;
  end if;
  if anc <> 16 or nouv <> 0 then
    raise exception 'État intermédiaire : % ancien(s), % nouveau(x)', anc, nouv;
  end if;

  select count(*) into n from public.items
   where subcat in ('peau12','peau14','peau16','peau22','peau_autre')
     and id not in (select old from _map);
  if n > 0 then raise exception '% peau(x) hors correspondance', n; end if;
end $$;

-- Renumérotation en deux temps
update public.items set id = '~' || id
 where subcat in ('peau12','peau14','peau16','peau22','peau_autre');
update public.history set item_id = '~' || item_id
 where item_id in (select old from _map);

update public.items i
   set id = m.new, subcat = 'consommable_inst', cat = 'instruments'
  from _map m where i.id = '~' || m.old;

update public.history h set item_id = m.new
  from _map m where h.item_id = '~' || m.old;

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
   where p.prep is not null and jsonb_typeof(p.prep) = 'object' and p.prep <> '{}'::jsonb;
end $$;

-- Le seul nom qui ne dit pas sa taille, et en français de surcroît
update public.items set name = replace(name, ' — autre taille', '')
 where name like '%— autre taille%';

-- Contrôles avant validation
do $$ declare n int; attendu int; begin
  select count(*) into n from public.items where id like '~%';
  if n > 0 then raise exception 'Il reste % identifiant(s) en ~', n; end if;
  select count(*) into n from public.history where item_id like '~%';
  if n > 0 then raise exception 'Il reste % ligne(s) d''historique en ~', n; end if;
  select count(*) into n from public.items
   where subcat in ('peau12','peau14','peau16','peau22','peau_autre');
  if n > 0 then raise exception '% item(s) encore dans une ancienne taille', n; end if;
  /* On vérifie que ce qui a bougé est arrivé à bon port, pas qu'il y
     ait exactement 16 items : sur une base vierge il n'y en a aucun,
     et exiger 16 empêchait de remonter le schéma pour un essai de
     restauration. Révélé par l'essai du 14 octobre 2026. */
  /* À l'arrivée, les seize portent le nouvel identifiant — qu'elles
     viennent d'être reclassées ou qu'elles l'aient déjà été. Les cas
     « rien à faire » sont sortis plus haut. */
  select e.ancien into attendu from _etat e;
  if attendu = 0 then return; end if;
  select count(*) into n
    from _map m join public.items i on i.id = m.new
   where i.subcat <> 'consommable_inst';
  if n > 0 then raise exception '% item(s) renuméroté(s) mais pas reclassé(s)', n; end if;
  select count(*) into n from _map m join public.items i on i.id = m.new;
  if n <> 16 then raise exception '% peau(x) sur 16 reclassée(s)', n; end if;
end $$;

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
    raise exception 'guard_items n''a pas été réactivé (état %)', e;
  end if;
end $$;

commit;

-- Vérification : doit renvoyer 16
--   select count(*) from items where subcat = 'consommable_inst';
