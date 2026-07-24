-- Migration V3 — à coller dans Supabase > SQL Editor > Run
-- 1. Sous-emplacements
alter table locations add column if not exists parent text;
-- 2. Nouveaux états de réparation ("à réparer" devient "en attente de réparation")
update items set cond = 'attente' where cond = 'reparer';
update history set cond = 'attente' where cond = 'reparer';
