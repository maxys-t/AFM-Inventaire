-- ============================================================
-- 038 — Les écrans prennent des identifiants DSP-…
--
-- À PASSER APRÈS LA 037, DANS UN ONGLET NEUF.
--
-- CPU-006 … CPU-010 deviennent DSP-001 … DSP-005. Un identifiant
-- n'est pas qu'une étiquette : il est cité par l'historique, les
-- caisses, les projets, les réparations. Le renommer se fait donc
-- en une seule transaction, ou pas du tout.
--
-- CE QUI SUIT TOUT SEUL
--   Les clés étrangères vers items(id) sont toutes déclarées
--   « on update cascade » : repairs, pack_items, packs.container_id,
--   item_needs (item_id et needs_item_id), item_link_members se
--   mettent à jour d'elles-mêmes. C'est précisément à ça que sert
--   cette clause, et c'est pour ça qu'elle avait été écrite.
--
-- CE QUI NE SUIT PAS
--   `history.item_id` n'a pas de clé étrangère (table de la 001,
--   antérieure à l'idée). On la met à jour à la main.
--
--   `projects.item_ids`, `prep`, `subs` et `snapshot` sont du JSON :
--   aucune cascade ne les atteint. Plutôt que de réécrire du JSON à
--   l'aveugle, cette migration VÉRIFIE qu'aucun projet ne les cite
--   et s'ARRÊTE sinon. Une migration qui échoue proprement vaut
--   mieux qu'une migration qui en oublie la moitié en silence.
--
-- LES PHOTOS
--   Elles vivent dans le stockage sous `items/CPU-006.jpg`, et
--   `items.photo` garde l'adresse complète : rien ne casse, les
--   vignettes continuent de s'afficher. Une photo remplacée plus
--   tard s'écrira sous `items/DSP-001.jpg`. L'ancien fichier
--   restera sans être cité — sans conséquence.
--
-- LES ÉTIQUETTES
--   Cinq étiquettes collées deviennent inexactes. C'est le coût
--   assumé de l'opération.
--
-- Rejouable : tout est conditionné à l'ancien identifiant, qui
-- n'existe plus après le premier passage.
-- ============================================================

do $$
declare
  paires constant text[][] := array[
    ['CPU-006','DSP-001'],   -- LG 32UN880P
    ['CPU-007','DSP-002'],   -- LG 43UN700
    ['CPU-008','DSP-003'],   -- Asus Zen Screen MB14A #1
    ['CPU-009','DSP-004'],   -- Asus Zen Screen MB14A #2
    ['CPU-010','DSP-005']    -- Asus Zen Screen MB14A #3
  ];
  ancien text; nouveau text;
  bloquants text;
  deja     text;
  faits    int := 0;
begin
  -- --------------------------------------------------------
  -- 1. Garde-fou : aucun projet ne doit citer ces identifiants
  -- --------------------------------------------------------
  select string_agg(p.name, ', ') into bloquants
  from public.projects p
  where exists (
    select 1 from unnest(paires) as a(v)
    where a.v like 'CPU-%'
      and (coalesce(p.item_ids::text,'') || coalesce(p.prep::text,'')
        || coalesce(p.subs::text,'')     || coalesce(p.snapshot::text,''))
          like '%' || a.v || '%');

  if bloquants is not null then
    raise exception
      'Renumérotation annulée : ces projets citent encore les anciens identifiants (%). Retire les écrans de ces projets, puis relance.',
      bloquants;
  end if;

  -- --------------------------------------------------------
  -- 2. Garde-fou : les nouveaux identifiants doivent être libres
  -- --------------------------------------------------------
  select string_agg(i.id, ', ') into deja
  from public.items i
  where i.id like 'DSP-%';

  if deja is not null then
    raise notice 'Identifiants DSP déjà présents : % — vérifie avant de continuer.', deja;
  end if;

  -- --------------------------------------------------------
  -- 3. Le renommage, un couple à la fois
  --
  --    `guard_items` est mis en pause : il refuse tout changement
  --    d'identifiant à qui n'est pas éditeur, et il nous compte
  --    parmi ceux-là. Voir l'explication en tête de la 037 — en
  --    deux mots, l'éditeur SQL du tableau de bord n'est PAS
  --    anonyme, contrairement à ce que supposait la 005.
  --
  --    Le garde-fou protège l'application, pas les migrations. On
  --    le suspend franchement et on le rallume quoi qu'il arrive,
  --    plutôt que d'y percer une exception permanente.
  -- --------------------------------------------------------
  alter table public.items disable trigger guard_items;

  for i in 1 .. array_length(paires, 1) loop
    ancien  := paires[i][1];
    nouveau := paires[i][2];

    if not exists (select 1 from public.items where id = ancien) then
      continue;                     -- déjà fait : on passe
    end if;
    if exists (select 1 from public.items where id = nouveau) then
      raise exception '% est déjà pris — renumérotation annulée.', nouveau;
    end if;

    -- Les clés étrangères suivent toutes seules (on update cascade).
    update public.items set id = nouveau where id = ancien;

    -- L'historique, lui, n'a pas de clé étrangère. Il décrit le
    -- MÊME objet physique : la trace doit le suivre, sinon la fiche
    -- de l'écran s'ouvrirait vide.
    update public.history set item_id = nouveau where item_id = ancien;

    -- Et on garde la mémoire du changement là où on la cherchera.
    insert into public.history (item_id, type, detail)
    values (nouveau, 'edit',
            'Renumbered from ' || ancien || ' — moved to the Display sub-category. '
            || 'The printed label still shows the old code.');

    faits := faits + 1;
  end loop;

  alter table public.items enable trigger guard_items;
  raise notice '% écran(s) renuméroté(s).', faits;

exception when others then
  -- Ne JAMAIS sortir d'ici en laissant le garde-fou éteint, même si
  -- l'un des contrôles ci-dessus a arrêté la migration.
  alter table public.items enable trigger guard_items;
  raise;
end $$;

-- Et on le VÉRIFIE, comme la 020 l'avait établi : se fier au fait
-- qu'on a écrit la ligne ne suffit pas, c'est l'état réel qui compte.
do $$ declare e char; begin
  select tgenabled into e from pg_trigger
   where tgname = 'guard_items' and tgrelid = 'public.items'::regclass;
  if e is distinct from 'O' then
    raise exception 'guard_items n''a pas été réactivé (état %)', e;
  end if;
end $$;

insert into public.schema_migrations (id, name, note)
values ('038', '038-renumerotation-ecrans.sql',
        'CPU-006..010 deviennent DSP-001..005, history suit, FK en cascade')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Contrôle : cinq écrans en DSP-…, plus aucun CPU-006..010
-- ------------------------------------------------------------
select
  (select count(*) from public.items   where id like 'DSP-%')              as ecrans_dsp,
  (select count(*) from public.items   where id in ('CPU-006','CPU-007','CPU-008','CPU-009','CPU-010')) as restes_cpu,
  (select count(*) from public.history where item_id like 'DSP-%')          as lignes_historique,
  (select count(*) from public.items   where cat='informatique' and subcat='ordinateur'
     and coalesce(archived,false) = false)                                  as ordinateurs;
