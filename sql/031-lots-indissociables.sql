-- ============================================================
-- 031 — Des lots indissociables, au lieu d'un lien dirigé
--
-- À COLLER EN ENTIER DANS L'ÉDITEUR SQL DE SUPABASE.
--
-- Ce script PART DE N'IMPORTE QUEL ÉTAT : base jamais migrée, base
-- arrêtée au milieu d'un essai précédent, ou base déjà convertie. Il
-- regarde ce qui existe avant chaque geste, et se termine par un
-- tableau qui dit où tu en es. Le relancer deux fois ne fait rien de
-- plus que la première.
--
-- ------------------------------------------------------------
-- CE QU'IL FAIT, ET POURQUOI
--
-- La 030 a posé « A a besoin de B », avec un parent et un enfant.
-- L'usage a dit autre chose : les deux enceintes Amphion et leur
-- Amp 700 ne sont pas trois objets dont l'un sert les autres. C'est
-- UN LOT. On ne sort jamais une enceinte seule, ni le Germanium
-- Preamp sans son alimentation.
--
-- Un lot est SYMÉTRIQUE : pas de parent, pas d'enfant, on bouge
-- l'un, tout suit. Et les règles de rattrapage qu'exigeait le modèle
-- dirigé — « il ne rentre que quand tous ses parents sont rentrés »
-- — disparaissent, parce qu'un lot ne se divise jamais.
--
-- On REMPLACE au lieu d'ajouter : garder les deux mécanismes
-- obligerait à choisir entre eux à chaque déclaration, pour une
-- différence que personne ne saurait énoncer. C'est ce qui avait
-- rendu les packs incompréhensibles en v1.20, et que la 021 avait dû
-- défaire. On ne recommence pas.
--
-- Les besoins ORDINAIRES de la 029 — « IEC C13 », « DC 12V » — ne
-- bougent pas. Eux sont légitimement dirigés : un appareil a besoin
-- d'un cordon, un cordon n'a besoin de rien.
--
-- ⚠️ SAUVEGARDE AVANT. Ce script convertit tes liens puis supprime la
-- colonne qui les portait. Rien n'est perdu, mais le retour en
-- arrière passe par la sauvegarde.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Les lots
-- ------------------------------------------------------------
create table if not exists public.item_link_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists public.item_link_members (
  group_id uuid not null references public.item_link_groups(id) on delete cascade,
  item_id  text not null references public.items(id)
           on update cascade on delete cascade,
  primary key (group_id, item_id)
);

-- Un item n'appartient qu'à UN lot. Ce n'est pas une restriction,
-- c'est la définition : si A voyage avec B et B avec C, alors A, B
-- et C forment un seul lot. L'imposer ici évite d'avoir à calculer
-- une fermeture transitive à chaque lecture, pour l'éternité.
create unique index if not exists item_link_un_seul_lot
  on public.item_link_members (item_id);

comment on table public.item_link_groups is
  'Des objets qui ne se séparent jamais : les deux Amphion et leur '
  'Amp 700, un préampli et son alimentation attitrée. Symétrique — '
  'on bouge l''un, tout suit. Aucun n''est le parent des autres.';


-- ------------------------------------------------------------
-- 2. Conversion des liens dirigés, s'il en reste
--
--    Chaque paire (item_id, needs_item_id) devient un lot. Deux
--    paires qui partagent un item n'en forment qu'UN : les deux
--    Amphion et l'Amp 700 arrivent en deux paires et doivent
--    ressortir en un lot de trois. D'où la fusion ci-dessous, faite
--    une seule fois, ici.
--
--    Tout passe par `execute` : une requête dynamique n'est lue
--    qu'au moment où elle s'exécute. Si la colonne a déjà disparu
--    lors d'un essai précédent, ce bloc ne la mentionne jamais —
--    c'est ce qui rend le script rejouable après un échec.
-- ------------------------------------------------------------
do $$
declare
  paire record;
  g1 uuid; g2 uuid; nouveau uuid;
begin
  if to_regclass('public.item_needs') is null then
    raise notice '031 : table item_needs absente, rien à convertir.';
    return;
  end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'item_needs'
                    and column_name = 'needs_item_id') then
    raise notice '031 : colonne needs_item_id déjà retirée, conversion déjà faite.';
    return;
  end if;

  for paire in execute
    'select item_id as a, needs_item_id as b
       from public.item_needs
      where needs_item_id is not null'
  loop
    select group_id into g1 from public.item_link_members where item_id = paire.a;
    select group_id into g2 from public.item_link_members where item_id = paire.b;

    if g1 is null and g2 is null then
      -- Ni l'un ni l'autre n'est encore placé : on ouvre un lot.
      insert into public.item_link_groups default values returning id into nouveau;
      insert into public.item_link_members(group_id, item_id)
        values (nouveau, paire.a), (nouveau, paire.b);

    elsif g1 is null then
      insert into public.item_link_members(group_id, item_id) values (g2, paire.a);

    elsif g2 is null then
      insert into public.item_link_members(group_id, item_id) values (g1, paire.b);

    elsif g1 <> g2 then
      -- Deux lots que cette paire relie : ils n'en font qu'un.
      update public.item_link_members set group_id = g1 where group_id = g2;
      delete from public.item_link_groups where id = g2;
    end if;
  end loop;

  raise notice '031 : conversion terminée.';
end $$;


-- ------------------------------------------------------------
-- 3. Un nom lisible, construit à partir des membres
--    Aucun rôle fonctionnel : il sert à parler du lot dans une ligne
--    d'historique. Un lot sans nom n'est pas un lot sans identité.
-- ------------------------------------------------------------
update public.item_link_groups g
   set name = sous.titre
  from (
    select m.group_id, string_agg(i.name, ' + ' order by i.name) as titre
      from public.item_link_members m
      join public.items i on i.id = m.item_id
     group by m.group_id
  ) sous
 where sous.group_id = g.id
   and (g.name is null or g.name is distinct from sous.titre);

-- Un lot d'un seul membre n'est pas un lot : il a pu en rester un
-- d'un essai interrompu. On ne laisse pas traîner une coquille qui
-- ressemble à une relation.
delete from public.item_link_groups g
 where (select count(*) from public.item_link_members m where m.group_id = g.id) < 2;


-- ------------------------------------------------------------
-- 4. On retire le lien dirigé, et ce qui le gardait
--    Les contraintes et l'index de la 030 parlaient de cette
--    colonne : ils partent avec elle.
-- ------------------------------------------------------------
drop index   if exists public.item_needs_un_seul_parent;
drop index   if exists public.item_needs_lien_unique;
drop index   if exists public.item_needs_cible_idx;
drop trigger if exists item_needs_cycle on public.item_needs;
drop function if exists public.item_needs_cycle_check();

alter table public.item_needs drop constraint if exists item_needs_cible_chk;
alter table public.item_needs drop constraint if exists item_needs_pas_soi_chk;
alter table public.item_needs drop column     if exists needs_item_id;


-- ------------------------------------------------------------
-- 5. Les lignes converties quittent item_needs
--
--    Elles portaient une cible et AUCUN libellé — la 029 imposait
--    l'un ou l'autre — et leur information vit désormais dans un
--    lot. Les laisser en ferait des cases à cocher vides sur chaque
--    checklist, en plus de dire deux fois la même chose.
--
--    C'est l'étape qui manquait à la première écriture de cette
--    migration ; la contrainte ci-dessous l'a signalé plutôt que de
--    laisser passer des lignes muettes. C'est exactement son rôle.
-- ------------------------------------------------------------
delete from public.item_needs
 where label is null or length(btrim(label)) = 0;

alter table public.item_needs drop constraint if exists item_needs_label_chk;
alter table public.item_needs add  constraint item_needs_label_chk
  check (label is not null and length(btrim(label)) between 1 and 120);

comment on table public.item_needs is
  'Ce qu''il faut emporter AVEC un item et qui ne mérite pas de fiche : '
  'cordons secteur, adaptateurs. Dirigé, légitimement — un appareil a '
  'besoin d''un cordon, un cordon n''a besoin de rien. Les objets qui '
  'ont une fiche vivent dans item_link_groups.';


-- ------------------------------------------------------------
-- 6. Droits
--    Même règle que partout : un stagiaire coche une préparation, il
--    ne redéfinit pas ce qui voyage ensemble.
-- ------------------------------------------------------------
alter table public.item_link_groups  enable row level security;
alter table public.item_link_members enable row level security;

drop policy if exists "link_groups_select" on public.item_link_groups;
create policy "link_groups_select" on public.item_link_groups
  for select to authenticated using (is_member());
drop policy if exists "link_groups_write" on public.item_link_groups;
create policy "link_groups_write" on public.item_link_groups
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());

drop policy if exists "link_members_select" on public.item_link_members;
create policy "link_members_select" on public.item_link_members
  for select to authenticated using (is_member());
drop policy if exists "link_members_write" on public.item_link_members;
create policy "link_members_write" on public.item_link_members
  for all to authenticated
  using (can_edit_inventory()) with check (can_edit_inventory());


-- ============================================================
-- 7. OÙ TU EN ES
--    Ce tableau s'affiche à la fin. Tout doit être « ok ».
-- ============================================================
select
  case when not exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='item_needs'
           and column_name='needs_item_id')
       then 'ok — retiré' else '⚠ encore là' end            as lien_dirige,
  case when exists (select 1 from pg_indexes
         where tablename='item_link_members'
           and indexname='item_link_un_seul_lot')
       then 'ok — un seul lot par item' else '⚠ absent' end as regle_lot,
  case when not exists (select 1 from public.item_needs where label is null)
       then 'ok — aucune ligne muette' else '⚠ à nettoyer' end as besoins,
  (select count(*) from public.item_link_groups)             as lots,
  (select count(*) from public.item_link_members)            as membres;

-- Et le détail de tes lots. Les Amphion et l'Amp 700, s'ils étaient
-- déclarés, doivent former UNE ligne de trois membres.
-- (À lancer séparément : l'éditeur n'affiche que le dernier résultat.)
--
-- select g.name, count(*) as membres, array_agg(m.item_id order by m.item_id)
--   from public.item_link_groups g
--   join public.item_link_members m on m.group_id = g.id
--  group by g.id, g.name order by g.name;
