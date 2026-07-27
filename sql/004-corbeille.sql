-- Migration 004 — Corbeille (suppression réversible)
-- Un item supprimé n'est plus effacé : il reçoit une date de suppression.
-- Il disparaît des listes de l'application mais reste récupérable.

alter table items add column if not exists deleted_at timestamptz;

-- Index pour que le filtrage des items actifs reste rapide
create index if not exists items_deleted_at_idx on items (deleted_at);
