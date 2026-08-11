# AFM Inventory Tracker

Application web de gestion de l'inventaire du studio AFM : matériel, prêts,
réparations, emplacements et projets de tournée. Réservée au personnel du studio,
utilisable sur ordinateur comme sur mobile.

> Version actuelle : **1.0.0** — voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet.

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
  Sert aussi pour les artistes de passage : un projet à leur nom, auquel on ajoute le
  matériel au fur et à mesure.
- **Tableau de bord** : vue d'ensemble, alertes (retards, matériel à réparer),
  activité récente.
- **Corbeille** : un item supprimé reste récupérable 30 jours, avec tout son historique.

Les données sont partagées en temps réel entre tous les utilisateurs : une action
faite par une personne apparaît chez les autres sans recharger la page. Chaque action
est signée par le compte qui l'a effectuée.

## Connexion et rôles

L'application est **réservée au personnel** : sans compte autorisé, rien n'est visible.

La connexion se fait **par email, sans mot de passe** : on saisit son adresse, on reçoit
un lien, on clique, on est connecté pour plusieurs jours.

| Rôle | Peut faire |
|------|------------|
| **Administrateur** | Tout : ajouter / modifier / supprimer du matériel, gérer emplacements, personnes, projets et comptes. |
| **Stagiaire** | Consulter l'inventaire, faire des check-out / check-in, signaler du matériel à réparer, préparer les projets. Ne peut ni créer, ni modifier, ni supprimer de fiches. |

**Ajouter quelqu'un** (admins) : onglet *Utilisateurs* → saisir son email et son rôle →
lui transmettre l'adresse du site. Il saisira son email et recevra son lien. Toute
personne non inscrite dans cet onglet ne voit rien.

Les **emprunteurs** (musiciens, prestataires, artistes de passage) n'ont pas de compte :
ce sont de simples noms dans l'onglet *Personnes*, ou des projets.

## Utilisation

- **En ligne** : le site est hébergé sur GitHub Pages. Ouvrir l'URL suffit.
- **Sur mobile** : la même URL, interface responsive — idéal en tournée ou session mobile.
- **Corbeille** : bouton 🗑 dans l'en-tête (admins), visible seulement si elle contient
  quelque chose.
- **Pastille de connexion** : verte = données synchronisées, rouge clignotante =
  connexion perdue, les modifications ne sont pas enregistrées.
- **Exporter / Importer** (admins) : sauvegarder ou restaurer toutes les données en JSON.

## Architecture du code

Application web statique (HTML / CSS / JavaScript), sans outil de build.

```
index.html              Structure des écrans et des fenêtres + chargement des scripts
css/styles.css          Toute l'apparence (thème sombre façon Apple)
js/config.js            ⚙️  RÉGLAGES — le seul fichier à modifier pour personnaliser
js/auth.js              Connexion, session, rôles (fonction can())
js/helpers.js           Utilitaires : dates, texte, identifiants, emplacements
js/db.js                État en mémoire + SEUL fichier qui communique avec Supabase
js/views-dashboard.js   Écran Tableau de bord
js/views-inventory.js   Écran Inventaire + formulaire, fiche item, QR, check-in/out
js/views-projects.js    Écran Projets (templates de tournée, checklist, mode Show)
js/views-out.js         Écran Sortis
js/views-repairs.js     Écran Réparations
js/views-people-loc.js  Écrans Personnes & Emplacements
js/views-trash.js       Corbeille (restauration, purge)
js/views-users.js       Écran Utilisateurs (comptes et rôles, admins uniquement)
js/app.js               Navigation, fenêtres, notifications, export/import, démarrage
sql/                    Scripts de la base de données, à exécuter dans l'ordre
```

**Règle d'architecture** : les fichiers `views-*` ne communiquent jamais avec Supabase
directement. Ils lisent l'état (`db.items`, `db.projects`…) et appellent les fonctions
`api*` de `db.js`. Conséquence pratique :

- un problème de **données** (rien ne s'enregistre) → chercher dans `db.js`
- un problème d'**affichage** → chercher dans le fichier de la vue concernée
- un problème de **connexion ou de droits** → `js/auth.js` et `sql/005-comptes.sql`
- une **personnalisation** (catégories, textes, seuils) → `js/config.js`

**Ordre de chargement des scripts** (défini en bas de `index.html`) :
config → auth → helpers → db → vues → app. Ne pas le modifier.

## Où modifier quoi

| Je veux…                                    | Fichier                              |
|---------------------------------------------|--------------------------------------|
| Changer une couleur, une taille             | `css/styles.css` (bloc `:root`)      |
| Ajouter / renommer une catégorie            | `js/config.js` (`CATS` + `CATCODE`)  |
| Changer le titre, les noms d'onglets        | `js/config.js` (`LABELS`)            |
| Changer le seuil d'alerte (7 jours)         | `js/config.js` (`ALERT_DAYS`)        |
| Changer la durée de la corbeille (30 jours) | `js/config.js` (`TRASH_RETENTION_DAYS`) |
| Élargir les droits des stagiaires           | `sql/005-comptes.sql` (`can_edit_inventory`) **et** `js/auth.js` (`STAGIAIRE_CAN`) |
| Corriger un écran                           | `js/views-….js` correspondant        |
| Modifier un enregistrement en base          | `js/db.js`                           |

### Élargir les droits des stagiaires

Les permissions sont volontairement centralisées en **un seul point de décision** de
chaque côté. Pour autoriser les stagiaires à créer et modifier du matériel :

1. Dans Supabase (SQL Editor), remplacer dans la fonction `can_edit_inventory()` :
   `select my_role() in ('admin')` par `select my_role() in ('admin','stagiaire')`.
2. Dans `js/auth.js`, ajouter `'edit'` à la liste `STAGIAIRE_CAN` pour que les boutons
   apparaissent.

La première étape suffit à la sécurité ; la seconde ne fait qu'afficher les boutons.

## Base de données (Supabase)

Tables : `items`, `people`, `locations`, `history`, `projects`, `profiles`.

Les scripts du dossier `sql/` sont **ré-exécutables sans danger** et doivent être joués
dans l'ordre, **un par un, l'éditeur vidé entre chaque** :

1. `001-init.sql` — schéma initial
2. `002-reparations-sousemplacements.sql` — états de réparation + sous-emplacements
3. `003-projets.sql` — projets / tournées
4. `004-corbeille.sql` — suppression réversible
5. `005-comptes.sql` — comptes, rôles et règles d'accès

> L'éditeur SQL de Supabase annule tout le script dès qu'une instruction échoue :
> en cas d'erreur, considérer que **rien** n'a été appliqué.

**Sécurité** : les règles sont appliquées côté base (Row Level Security). Une action
interdite est refusée même en contournant l'interface. La clé publique présente dans
`js/config.js` ne donne accès à rien sans compte autorisé.

**Configuration Supabase requise** : l'envoi des emails de connexion (Authentication →
SMTP) et l'adresse du site (Authentication → URL Configuration, Site URL + Redirect URLs).
Toute nouvelle adresse du site doit y être ajoutée, sinon les liens de connexion ne
ramènent nulle part.

## Sauvegardes

Un repo **privé séparé** (`AFM-Inventaire-Backup`) exporte automatiquement toute la base
chaque nuit via GitHub Actions et conserve 90 jours de sauvegardes datées. La clé secrète
Supabase n'existe que dans les Secrets de ce repo privé — jamais ici.

**Restaurer** : télécharger le fichier voulu (`backups/latest.json` ou une date précise),
puis utiliser le bouton **Importer** de l'application. Les deux formats (sauvegarde
automatique et export manuel) sont acceptés.

> À ne pas faire sur la base de production « pour voir » : l'import ajoute l'historique
> sans écraser l'existant, ce qui créerait des doublons.

## Déploiement (mise à jour du site)

1. Uploader le contenu du dossier à la racine du repo GitHub
   (`index.html` + dossiers `css/`, `js/`, `sql/`).
2. **Important** : incrémenter le paramètre `?v=` dans `index.html`
   (ex : `?v=1.0.0` → `?v=1.0.1`) pour forcer les navigateurs à recharger les fichiers.
3. GitHub Pages republie automatiquement en ~1 minute.

À chaque changement, suivre la checklist de [UPDATE-PROCESS.md](UPDATE-PROCESS.md) :
`?v=` dans `index.html`, entrée en haut du [CHANGELOG.md](CHANGELOG.md), commit Git.

**Environnement de test** : un second projet Supabase « bac à sable » permet d'essayer
les migrations et les changements de règles d'accès sans toucher aux données du studio.
À utiliser systématiquement pour toute modification touchant `005-comptes.sql` — c'est
le seul endroit où une erreur peut verrouiller tout le monde dehors.

## Feuille de route

- **Email** : Configuration du systeme mail Resend sur le domaine accessflow.fr (subdomain: notif.accessflow.fr ?)
- **Automatisations** : relances email pour le matériel en retard,
  récapitulatif hebdomadaire du matériel sorti et des réparations en attente.

**Idées pour plus tard (non planifiées)**

- **Écosystème studio** : intégration au portail local du studio (page d'accueil,
  page guest wifi / bons plans), l'inventaire comme service interne. Sauvegarde complète
  supplémentaire sur le serveur du studio.
-  **Catégories de réparation** : distinguer Instrument / Informatique / Autre
  (infrastructure, mobilier…) pour filtrer et suivre les réparations par nature.
- **Valeur du matériel** : renseigner le prix de chaque item, avec tri décroissant par
  défaut pour voir les pièces les plus coûteuses en premier — utile pour les assurances
  et les priorités de réparation.
