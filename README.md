# AFM Inventory Tracker — v0.6

Application web de gestion d'inventaire du studio : matériel, check-in/check-out,
réparations, emplacements, projets/tournées. Données partagées en temps réel via Supabase.

## Architecture

```
index.html              Structure HTML (écrans, modales) + chargement des scripts
css/styles.css          Toute l'apparence
js/config.js            ⚙️  RÉGLAGES — le seul fichier à modifier pour personnaliser
js/helpers.js           Utilitaires purs : dates, texte, IDs, emplacements
js/db.js                État en mémoire + SEUL fichier qui parle à Supabase (fonctions api*)
js/views-dashboard.js   Écran Tableau de bord
js/views-inventory.js   Écran Inventaire + formulaire item + fiche + QR + check-in/out
js/views-projects.js    Écran Projets (templates de tournée, checklist, Show)
js/views-out.js         Écran Sortis
js/views-repairs.js     Écran Réparations
js/views-people-loc.js  Écrans Personnes & Emplacements
js/app.js               Navigation, modales, export/import, démarrage
sql/                    Migrations de la base, à exécuter dans l'ordre (SQL Editor Supabase)
```

**Règle d'architecture** : les fichiers `views-*` ne parlent jamais à Supabase
directement. Ils lisent l'état (`db.items`, `db.projects`…) et appellent les
fonctions `api*` de `db.js`. Un bug de données → chercher dans `db.js`.
Un bug d'affichage → chercher dans le fichier de la vue concernée.

**Ordre de chargement des scripts** (défini en bas de `index.html`) :
config → helpers → db → vues → app. Ne pas le modifier.

## Modifier l'application

| Je veux…                                   | Fichier               |
|--------------------------------------------|------------------------|
| Changer une couleur, une taille            | `css/styles.css`       |
| Ajouter/renommer une catégorie             | `js/config.js` (CATS + CATCODE) |
| Changer le titre, les noms d'onglets       | `js/config.js` (LABELS) |
| Changer le seuil d'alerte (7 jours)        | `js/config.js` (ALERT_DAYS) |
| Corriger un écran                          | `js/views-….js` correspondant |
| Modifier un enregistrement en base         | `js/db.js`             |

Après chaque modification déployée, incrémenter le paramètre `?v=0.6` dans
`index.html` (ex : `?v=0.7`) pour forcer les navigateurs à recharger les fichiers.

## Déploiement

GitHub Pages : uploader tout le contenu du dossier à la racine du repo
(le dossier `index.html` + `css/` + `js/` + `sql/`). Rien d'autre à configurer.

## Base de données (Supabase)

Tables : `items`, `people`, `locations`, `history`, `projects`.
Les scripts de `sql/` sont ré-exécutables sans danger et à jouer dans l'ordre
sur un nouveau projet Supabase. Sécurité actuelle : accès libre avec la clé
anon (prototype) — l'authentification par comptes est prévue en v1.0.

## Historique des versions

- **v0.6 : découpage du code en modules (ce dossier) — aucun changement fonctionnel**
- v0.5 : projets/tournées, quantité à l'ajout
- v0.4 : UI Apple, date de retour + alertes, fenêtre unique
- v0.3 : réparations, sous-emplacements, filtres Sortis
- v0.2 : passage à Supabase (données partagées)
- v0.1 : prototype localStorage

