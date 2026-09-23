-- ============================================================
-- 010 — Codes d'identifiant alignés sur les catégories anglaises (v1.9.1)
-- Renomme les identifiants des items concernés et répercute le
-- changement sur l'historique et les projets.
-- À exécuter une fois dans Supabase → SQL Editor (éditeur vidé).
--
-- Aucune clé étrangère ne pointe vers items.id : l'opération est sûre.
-- Le renommage se fait en deux temps (préfixe temporaire « ~ ») pour
-- qu'aucun identifiant ne puisse entrer en collision pendant l'échange
-- — MID passe à MDY pendant que le câble MIDI prend MID.
-- ============================================================

begin;

-- 1. Sous-catégories dont le code change
create temp table code_map(subcat text primary key, new_code text) on commit drop;
insert into code_map(subcat, new_code) values
  ('alim','PSU'),
  ('ampli_casque','HPA'),
  ('autre','OTH'),
  ('boite','DMC'),
  ('casque','HPH'),
  ('chassis','R50'),
  ('condensateur','MCN'),
  ('dynamique','MDY'),
  ('eclairage','LGT'),
  ('electricite','ELC'),
  ('housse','BAG'),
  ('mesure_mic','MMS'),
  ('midi_cable','MID'),
  ('mobilier','FRN'),
  ('ordinateur','CPU'),
  ('outil','MSR'),
  ('peau10','H10'),
  ('peau12','H12'),
  ('peau13','H13'),
  ('peau14','H14'),
  ('peau16','H16'),
  ('peau18','H18'),
  ('peau22','H22'),
  ('peau_autre','HDX'),
  ('pied','MST'),
  ('reverb','REV'),
  ('ruban','MRB'),
  ('secteur','PWC'),
  ('stockage','STG');

-- 2. Correspondance ancien identifiant → nouveau, renumérotée à partir de 001
create temp table id_map on commit drop as
select i.id as old_id,
       m.new_code || '-' || lpad(
         (row_number() over (partition by m.new_code order by i.id))::text, 3, '0') as new_id
from public.items i
join code_map m on m.subcat = i.subcat;

-- 3. Items
update public.items i set id = '~' || m.new_id from id_map m where i.id = m.old_id;
update public.items set id = substring(id from 2) where id like '~%';

-- 4. Historique
update public.history h set item_id = '~' || m.new_id from id_map m where h.item_id = m.old_id;
update public.history set item_id = substring(item_id from 2) where item_id like '~%';

-- 5. Projets : liste du template et cases cochées de la préparation
update public.projects p
   set item_ids = coalesce((
         select jsonb_agg(coalesce(m.new_id, e.val) order by e.ord)
         from jsonb_array_elements_text(p.item_ids) with ordinality as e(val, ord)
         left join id_map m on m.old_id = e.val), '[]'::jsonb)
 where p.item_ids is not null and jsonb_typeof(p.item_ids) = 'array'
   and jsonb_array_length(p.item_ids) > 0;

update public.projects p
   set prep = coalesce((
         select jsonb_object_agg(coalesce(m.new_id, kv.key), kv.value)
         from jsonb_each(p.prep) kv
         left join id_map m on m.old_id = kv.key), '{}'::jsonb)
 where p.prep is not null and jsonb_typeof(p.prep) = 'object'
   and p.prep <> '{}'::jsonb;

-- 6. Récapitulatif : à conserver si tu veux retrouver un ancien identifiant
select old_id as "ancien", new_id as "nouveau"
from id_map order by new_id;

commit;
