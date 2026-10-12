-- ============================================================
-- 020 — Identifiants remis en accord avec leur sous-catégorie
--
-- Changer la sous-catégorie d'un item dans l'application ne
-- renumérote pas son identifiant : c'est volontaire, un identifiant
-- qui change tout seul rendrait fausse une étiquette déjà collée.
-- L'écart s'est donc accumulé, et la v1.20.2 l'a rendu visible.
--
-- Cette migration le résorbe en une fois. Elle ne prend aucune liste
-- en paramètre : elle compare chaque identifiant au code de sa
-- sous-catégorie et corrige ce qui diverge, quel que soit le nombre.
--
-- ⚠️ DES IDENTIFIANTS CHANGENT. Gratuit tant qu'aucune étiquette QR
-- n'est imprimée — ce qui est le cas aujourd'hui. SAUVEGARDE AVANT.
-- ============================================================

begin;

-- La table des codes, telle que config.js la définit.
create temporary table _codes(subcat text primary key, code text not null)
  on commit drop;
insert into _codes(subcat, code) values
  ('synthe','SYN'),
  ('boite','DMC'),
  ('guitare','GTR'),
  ('batterie','DRM'),
  ('percussion','PRC'),
  ('consommable_inst','ICS'),
  ('condensateur','MCN'),
  ('dynamique','MDY'),
  ('ruban','MRB'),
  ('mesure_mic','MMS'),
  ('trigger','TRG'),
  ('accessoire','MAC'),
  ('compresseur','CMP'),
  ('eq','EQU'),
  ('preampli','PRE'),
  ('effets','FXR'),
  ('chassis','R50'),
  ('drive','DRV'),
  ('modulation','MOD'),
  ('delay','DLY'),
  ('reverb','REV'),
  ('filtre','WAH'),
  ('pitch','PIT'),
  ('dynamique_p','DYN'),
  ('multi','MFX'),
  ('alim','PSU'),
  ('accordeur','TUN'),
  ('footswitch','FSW'),
  ('console','CON'),
  ('extension','CEX'),
  ('carte','CIO'),
  ('boite_di','DIB'),
  ('splitter','SPL'),
  ('reamp','RMP'),
  ('interface','INT'),
  ('ordinateur','CPU'),
  ('convertisseur','CNV'),
  ('controleur','CTL'),
  ('stockage','STG'),
  ('reseau','NET'),
  ('midi','MDI'),
  ('ampli_inst','AMP'),
  ('monitoring','MON'),
  ('casque','HPH'),
  ('ampli_casque','HPA'),
  ('xlr','XLR'),
  ('trs','TRS'),
  ('mini_trs','MTR'),
  ('ts','TS'),
  ('mini_ts','MTS'),
  ('rca','RCA'),
  ('xlrf_trs','XFT'),
  ('xlrm_trs','XMT'),
  ('secteur','PWC'),
  ('midi_cable','MID'),
  ('multipaire','MUL'),
  ('adaptateur','ADP'),
  ('patchbay','PBY'),
  ('pied','MST'),
  ('stand_clavier','KST'),
  ('stand_enceinte','SST'),
  ('extension_stand','EXT'),
  ('adaptateur_stand','CLP'),
  ('plateau','TRY'),
  ('housse','BAG'),
  ('flightcase','FLC'),
  ('outil','MSR'),
  ('mobilier','FRN'),
  ('rack19','RCK'),
  ('eclairage','LGT'),
  ('acoustique','ACO'),
  ('electricite','ELC'),
  ('autre','OTH');

-- Les items à renuméroter, et leur nouveau numéro.
--   Le numéro repart du plus grand déjà pris pour ce code, corbeille
--   comprise : réutiliser un numéro libéré ferait réapparaître un
--   identifiant mort dans un vieil historique.
create temporary table _map(old text primary key, new text not null) on commit drop;

insert into _map(old, new)
select x.id,
       x.code || '-' || lpad((x.depart + x.rang)::text, 3, '0')
  from (
    select i.id, c.code,
           coalesce((select max((regexp_replace(j.id, '^[A-Z0-9]+-', ''))::int)
                       from public.items j
                      where j.id ~ ('^' || c.code || '-[0-9]+$')), 0) as depart,
           row_number() over (partition by c.code order by i.id) as rang
      from public.items i
      join _codes c on c.subcat = i.subcat
     where split_part(i.id, '-', 1) <> c.code
  ) x;

-- Contrôles avant toute écriture.
do $$ declare n int; begin
  select count(*) into n from _map;
  raise notice 'Items à renuméroter : %', n;
  if n = 0 then raise notice 'Rien à faire.'; end if;

  select count(*) into n from _map m join public.items i on i.id = m.new;
  if n > 0 then raise exception '% nouvel(s) identifiant(s) déjà pris', n; end if;

  select count(*) into n from (select new from _map group by new having count(*) > 1) t;
  if n > 0 then raise exception '% doublon(s) dans les nouveaux identifiants', n; end if;
end $$;

alter table public.items disable trigger guard_items;
do $$ begin
  if to_regclass('public.projects') is not null then
    execute 'alter table public.projects disable trigger guard_projects';
  end if;
exception when others then null;
end $$;

-- Renumérotation en deux temps : le préfixe « ~ » évite qu'un nouvel
-- identifiant heurte un ancien encore en place.
update public.items set id = '~' || id where id in (select old from _map);
update public.history set item_id = '~' || item_id where item_id in (select old from _map);

update public.items i set id = m.new from _map m where i.id = '~' || m.old;
update public.history h set item_id = m.new from _map m where h.item_id = '~' || m.old;

-- `repairs`, `pack_items` et `packs.container_id` portent une clé
-- étrangère ON UPDATE CASCADE : ils ont suivi tout seuls.

-- Les projets stockent les identifiants en JSON : eux, non.
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

-- Contrôles avant validation.
do $$ declare n int; begin
  select count(*) into n from public.items where id like '~%';
  if n > 0 then raise exception 'Il reste % identifiant(s) en ~', n; end if;
  select count(*) into n from public.history where item_id like '~%';
  if n > 0 then raise exception 'Il reste % ligne(s) d''historique en ~', n; end if;

  select count(*) into n
    from public.items i join _codes c on c.subcat = i.subcat
   where split_part(i.id, '-', 1) <> c.code;
  if n > 0 then raise exception '% item(s) toujours au code périmé', n; end if;

  if to_regclass('public.pack_items') is not null then
    select count(*) into n from public.pack_items pi
      left join public.items i on i.id = pi.item_id where i.id is null;
    if n > 0 then raise exception '% appartenance(s) de pack orpheline(s)', n; end if;
  end if;
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

-- Vérification : doit renvoyer 0.
--   with codes(subcat, code) as (values … )
--   select count(*) from items i join codes c on c.subcat = i.subcat
--    where split_part(i.id,'-',1) <> c.code;
