-- ============================================================
-- 011 — Préférences d'affichage par compte
--
-- Table SÉPARÉE de `profiles`, volontairement.
-- `profiles` contient la colonne `role`. Y autoriser l'écriture
-- permettrait à n'importe quel compte de se passer `role = 'admin'`
-- depuis la console du navigateur. Ici chacun n'écrit que dans sa
-- propre ligne, et cette ligne ne contient aucun droit.
--
-- À exécuter dans Supabase → SQL Editor. Sans risque : la table
-- est créée vide et aucune donnée existante n'est touchée.
-- ============================================================

create table if not exists public.user_prefs (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  prefs      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_prefs enable row level security;

-- Chacun ne voit et n'écrit que sa propre ligne.
drop policy if exists "user_prefs select own" on public.user_prefs;
create policy "user_prefs select own" on public.user_prefs
  for select using (auth.uid() = user_id);

drop policy if exists "user_prefs insert own" on public.user_prefs;
create policy "user_prefs insert own" on public.user_prefs
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_prefs update own" on public.user_prefs;
create policy "user_prefs update own" on public.user_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_prefs delete own" on public.user_prefs;
create policy "user_prefs delete own" on public.user_prefs
  for delete using (auth.uid() = user_id);

-- Vérification : doit renvoyer 4 lignes.
-- select policyname from pg_policies where tablename = 'user_prefs';
