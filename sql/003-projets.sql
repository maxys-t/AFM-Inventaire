-- Migration V5 (projets / tournées) — à coller dans Supabase > SQL Editor > Run
create table if not exists projects (
  id text primary key,
  name text not null,
  description text default '',
  status text default 'inactif',       -- inactif | preparation | show
  item_ids jsonb default '[]',         -- liste fixe (template) des IDs d'items
  prep jsonb default '{}',             -- checklist : {"CAB-001": true, ...}
  last_used timestamptz,
  created_at timestamptz default now()
);

alter table projects enable row level security;
drop policy if exists "anon_all_projects" on projects;
create policy "anon_all_projects" on projects for all using (true) with check (true);

do $$
begin
  execute 'alter publication supabase_realtime add table projects';
exception when duplicate_object then null;
end $$;
