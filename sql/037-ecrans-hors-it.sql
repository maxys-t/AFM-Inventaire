-- ============================================================
-- 037 — Les écrans quittent la sous-catégorie « Computer »
--
-- En v2.8.5 j'ai créé la sous-catégorie « Display » et sorti les
-- écrans de l'onglet IT — mais côté CODE seulement : la vue IT
-- liste `subcat = 'ordinateur'`, et les cinq écrans y étaient
-- toujours rangés. J'avais laissé le déplacement en devoir à la
-- main, et c'était la mauvaise réponse.
--
-- LA LEÇON : quand une version change la signification d'une
-- catégorie, requalifier les lignes existantes fait partie de la
-- version. Sinon le code dit une chose, la base en dit une autre,
-- et c'est la base qui gagne à l'écran.
--
-- Rejouable : le `where` ne retient que ce qui n'a pas encore
-- bougé.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Avant : ce que l'on s'apprête à déplacer
-- ------------------------------------------------------------
select id, name, brand, cat, subcat
from public.items
where id in ('CPU-006','CPU-007','CPU-008','CPU-009','CPU-010')
order by id;

-- ------------------------------------------------------------
-- 2. Le déplacement
--
--    La liste est nominative, pas devinée sur le nom : un filtre
--    du genre « name ilike '%screen%' » attraperait un jour un
--    objet qui n'a rien à voir. Cinq lignes se nomment.
-- ------------------------------------------------------------
update public.items
   set subcat = 'ecran'
 where id in ('CPU-006',   -- LG 32UN880P
              'CPU-007',   -- LG 43UN700
              'CPU-008',   -- Asus Zen Screen MB14A #1
              'CPU-009',   -- Asus Zen Screen MB14A #2
              'CPU-010')   -- Asus Zen Screen MB14A #3
   and cat = 'informatique'
   and subcat = 'ordinateur';

-- ------------------------------------------------------------
-- 3. Les identifiants restent en CPU-…
--
--    Volontairement. Un identifiant est cité par l'historique, les
--    projets et les caisses ; il est peut-être déjà imprimé sur une
--    étiquette collée au dos de l'écran. L'application sait déjà
--    signaler l'écart — une pastille « code DSP ? » sur la fiche,
--    et la liste complète dans Settings. Renuméroter se décidera à
--    part, en connaissance de cause.
-- ------------------------------------------------------------

insert into public.schema_migrations (id, name, note)
values ('037', '037-ecrans-hors-it.sql',
        'Les 5 écrans passent de subcat ordinateur à ecran')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. Après : il doit rester 11 ordinateurs et 5 écrans
-- ------------------------------------------------------------
select subcat, count(*) as combien
from public.items
where cat = 'informatique' and subcat in ('ordinateur','ecran')
  and coalesce(archived, false) = false
group by subcat
order by subcat;
