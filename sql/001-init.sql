-- ============================================
-- Inventaire Studio — schéma Supabase (ré-exécutable sans erreur)
-- À coller dans : Supabase > SQL Editor > Run
-- ============================================

create table if not exists items (
  id text primary key,
  name text not null,
  cat text not null,
  brand text default '',
  serial text default '',
  cond text default 'bon',
  notes text default '',
  photo text,
  home text not null,
  loc text not null,
  status text default 'dispo',
  out jsonb,
  created_at timestamptz default now()
);

create table if not exists people (
  id text primary key,
  name text not null
);

create table if not exists locations (
  name text primary key
);

create table if not exists history (
  id bigint generated always as identity primary key,
  item_id text not null,
  type text not null,
  date timestamptz default now(),
  user_id text,
  detail text default '',
  cond text
);

-- RLS : accès libre avec la clé "anon" (prototype)
alter table items enable row level security;
alter table people enable row level security;
alter table locations enable row level security;
alter table history enable row level security;

drop policy if exists "anon_all_items" on items;
drop policy if exists "anon_all_people" on people;
drop policy if exists "anon_all_locations" on locations;
drop policy if exists "anon_all_history" on history;

create policy "anon_all_items" on items for all using (true) with check (true);
create policy "anon_all_people" on people for all using (true) with check (true);
create policy "anon_all_locations" on locations for all using (true) with check (true);
create policy "anon_all_history" on history for all using (true) with check (true);

-- Temps réel (ignore les tables déjà ajoutées)
do $$
declare t text;
begin
  foreach t in array array['items','people','locations','history'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Emplacements de départ (modifiables dans l'app)
insert into locations (name) values
  ('Rack A'), ('Salle 1'), ('Tiroir câbles XLR'), ('Régie')
  on conflict do nothing;
