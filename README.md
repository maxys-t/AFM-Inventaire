# AFM Inventory Tracker

Application web de gestion de l'inventaire du studio AFM : matériel, prêts,
réparations, emplacements et projets de tournée. Pensée pour être simple à
utiliser au quotidien, sur ordinateur comme sur mobile.

> Version actuelle : **0.6.1** — voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet.

## À quoi ça sert

- **Inventaire** : répertorier tout le matériel (synthés, micros, câbles, pédales…),
  chaque pièce ayant un identifiant unique, un emplacement, un état et un historique.
- **Check-out / check-in** : suivre qui a emprunté quoi, depuis quand, avec date de
  retour prévue et alerte en cas de retard — comme un prêt de bibliothèque.
- **Réparations** : suivre le matériel en attente de réparation, en réparation ou
  hors service, avec un journal détaillé.
- **Emplacements** : localiser chaque pièce, avec des lieux et des sous-emplacements
  (ex : Studio A › Rack synthés).
- **Projets / tournées** : regrouper une liste fixe de matériel en template réutilisable,
  avec checklist de préparation et passage automatique en mode « Show » (check-out groupé).
- **Tableau de bord** : vue d'ensemble, alertes (retards, matériel à réparer),
  activité récente.

Les données sont partagées en temps réel entre tous les utilisateurs via Supabase :
une action faite par une personne apparaît chez les autres sans recharger la page.

## Utilisation

- **En ligne** : le site est hébergé sur GitHub Pages. Ouvrir l'URL du site suffit.
- **Sur mobile** : la même URL, interface responsive — idéal en tournée ou session mobile.
- **Exporter / Importer** : boutons dans l'en-tête pour sauvegarder ou recharger
  toutes les données au format JSON.

## Architecture du code

Application web statique (HTML / CSS / JavaScript), sans outil de build : il suffit
d'ouvrir `index.html`. Aucune installation requise.

```
index.html              Structure des écrans et des fenêtres + chargement des scripts
css/styles.css          Toute l'apparence (thème sombre façon Apple)
js/config.js            ⚙️  RÉGLAGES — le seul fichier à modifier pour personnaliser
js/helpers.js           Utilitaires : dates, texte, identifiants, emplacements
js/db.js                État en mémoire + SEUL fichier qui communique avec Supabase
js/views-dashboard.js   Écran Tableau de bord
js/views-inventory.js   Écran Inventaire + formulaire, fiche item, QR, check-in/out
js/views-projects.js    Écran Projets (templates de tournée, checklist, mode Show)
js/views-out.js         Écran Sortis
js/views-repairs.js     Écran Réparations
js/views-people-loc.js  Écrans Personnes & Emplacements
js/app.js               Navigation, fenêtres, export/import, démarrage
sql/                    Scripts de la base de données, à exécuter dans l'ordre
```

**Règle d'architecture** : les fichiers `views-*` ne communiquent jamais avec
Supabase directement. Ils lisent l'état (`db.items`, `db.projects`…) et appellent
les fonctions `api*` de `db.js`. Conséquence pratique :

- un problème de **données** (rien ne s'enregistre) → chercher dans `db.js`
- un problème d'**affichage** → chercher dans le fichier de la vue concernée
- une **personnalisation** (catégories, textes, seuils) → `js/config.js`

**Ordre de chargement des scripts** (défini en bas de `index.html`) :
config → helpers → db → vues → app. Ne pas le modifier.

## Où modifier quoi

| Je veux…                                   | Fichier                          |
|--------------------------------------------|----------------------------------|
| Changer une couleur, une taille            | `css/styles.css` (bloc `:root`)  |
| Ajouter / renommer une catégorie           | `js/config.js` (`CATS` + `CATCODE`) |
| Changer le titre, les noms d'onglets       | `js/config.js` (`LABELS`)        |
| Changer le seuil d'alerte (7 jours)        | `js/config.js` (`ALERT_DAYS`)    |
| Corriger un écran                          | `js/views-….js` correspondant    |
| Modifier un enregistrement en base         | `js/db.js`                       |

## Base de données (Supabase)

Tables : `items`, `people`, `locations`, `history`, `projects`.

Les scripts du dossier `sql/` sont **ré-exécutables sans danger** et doivent être
joués dans l'ordre (SQL Editor de Supabase) sur un nouveau projet :

1. `001-init.sql` — schéma initial
2. `002-reparations-sousemplacements.sql` — états de réparation + sous-emplacements
3. `003-projets.sql` — projets / tournées

Les identifiants Supabase (URL + clé publique `anon`) sont dans `js/config.js`.

> **Sécurité** : dans la version actuelle, l'accès est libre pour toute personne
> disposant de l'URL du site (prototype). L'authentification par comptes
> (admin / utilisateur) est prévue pour la v1.0.

## Déploiement (mise à jour du site)

1. Uploader le contenu du dossier à la racine du repo GitHub
   (`index.html` + dossiers `css/`, `js/`, `sql/`).
2. **Important** : après chaque mise à jour, incrémenter le paramètre `?v=` dans
   `index.html` (ex : `?v=0.6.1` → `?v=0.6.2`) pour forcer les navigateurs à
   recharger les fichiers au lieu d'utiliser une version en cache.
3. GitHub Pages republie automatiquement en ~1 minute.

À chaque changement, penser à mettre à jour ensemble : le `?v=` dans `index.html`,
une entrée en haut de [CHANGELOG.md](CHANGELOG.md), et le message du commit Git.

## Feuille de route

- **v0.7** — Filet de sécurité : corbeille (suppression réversible), sauvegardes
  automatiques externes, meilleure gestion des erreurs d'enregistrement.
- **v1.0** — Comptes utilisateurs : connexion par email, rôles admin / utilisateur,
  règles de sécurité côté base.
- **v1.1** — Intégration au portail local du studio (page d'accueil, page guest).
- **v1.2** — Automatisations : relances email pour le matériel en retard, récap hebdo.
 
### Autres fonctionalités à ajouter par la suite:

 - Catégories de reparation
    - Instrument
    - Informatique
    - Autres (pour ce qui est infrastructure par exemple)

  - Recencer le prix de chaque item et trier par ordre décroissant par défaut, pour voir les 'plus gros' item en premier 
