-- ============================================================
-- 009 — Stockage des photos (v1.6)
-- Crée le "bucket" item-photos et ses droits d'accès.
-- À exécuter une fois dans Supabase → SQL Editor (éditeur vidé).
-- ============================================================

-- Le bucket : lecture publique (les photos s'affichent sans authentification),
-- écriture réservée aux comptes autorisés de l'inventaire.
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos_lecture" on storage.objects;
create policy "photos_lecture" on storage.objects
  for select using (bucket_id = 'item-photos');

drop policy if exists "photos_ajout" on storage.objects;
create policy "photos_ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and is_member());

drop policy if exists "photos_remplacement" on storage.objects;
create policy "photos_remplacement" on storage.objects
  for update to authenticated
  using (bucket_id = 'item-photos' and is_member())
  with check (bucket_id = 'item-photos' and is_member());

drop policy if exists "photos_suppression" on storage.objects;
create policy "photos_suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and is_admin());

-- Vérification : doit renvoyer une ligne avec public = true
select id, name, public from storage.buckets where id = 'item-photos';
