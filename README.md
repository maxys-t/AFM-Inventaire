# AFM Inventory Tracker

Application web de gestion de l'inventaire du studio AFM : matériel, prêts,
réparations, emplacements et projets de tournée. Réservée au personnel du studio,
utilisable sur ordinateur comme sur mobile.

> Version actuelle : **1.29.1** — voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet.

## À quoi ça sert

- **Inventaire** : répertorier tout le matériel, chaque pièce ayant un identifiant
  unique, une catégorie à deux niveaux, un emplacement, un poids, un état et un
  historique.
- **Packs** : regrouper ce qui voyage ensemble — un rack, une Pelicase, une lunchbox
  et ses modules. Un pack est une **recette réutilisable**, pas un rangement : le même
  préampli peut figurer dans la config studio et dans la config tournée, une seule
  étant montée à la fois. Les packs s'imbriquent, et portent leurs **consommables**
  (gaffer, piles, colliers) — des lignes de checklist, sans identifiant ni poids.
- **Projets / tournées** : un mélange de packs et d'items isolés, composé en pleine
  page par glisser-déposer. Checklist de préparation groupée par caisse, poids total
  et nombre de colis, et contenu **figé au départ** pour que vider une caisse le
  lendemain ne réécrive pas ce qui est parti.
- **Check-out / check-in** : suivre qui a emprunté quoi, depuis quand, avec date de
  retour prévue et alerte en cas de retard. Une caisse sort et rentre d'un geste.
- **Réparations** : dossier d'incident par panne, prestataires, photos avant et après,
  contrôle au retour. L'état physique et l'étape de réparation sont deux choses
  distinctes : **Good · Damaged, usable · Faulty · Out of service** d'un côté,
  un dossier ouvert de l'autre.
- **Emplacements** : localiser chaque pièce, avec des lieux, des sous-emplacements
  (ex : Studio A › Rack synthés) et des adresses hors-site.
- **Sélection multiple** : agir sur plusieurs items d'un coup (sortie, retour,
  emplacement, état, catégorie, corbeille).
- **QR codes** : scanner une étiquette ouvre la fiche de l'item dans l'application,
  prête pour un check-out.
- **Tableau de bord** : vue d'ensemble, alertes, et l'envoi direct d'une caisse.
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
| **Stagiaire** | Consulter l'inventaire, faire des check-out / check-in, signaler du matériel à réparer, préparer les projets. Ne peut ni créer, ni modifier, ni supprimer, ni reclasser de fiches. |

**Ajouter quelqu'un** (admins) : onglet *Utilisateurs* → saisir son email et son rôle →
lui transmettre l'adresse du site. Il saisira son email et recevra son lien. Toute
personne non inscrite dans cet onglet ne voit rien.

Les **emprunteurs** (musiciens, prestataires, artistes de passage) n'ont pas de compte :
ce sont de simples noms dans l'onglet *Personnes*, ou des projets.

## Catégories

Le matériel est classé sur **deux niveaux, tous deux obligatoires** : une famille
(Instruments, Micros & captation, Périphs, Pédales, DI & splitters, Amplification &
écoute, Informatique & interfaces, Câblage & connectique, Supports & transport,
Infrastructure & divers) puis une sous-catégorie.

L'identifiant d'un item se fabrique à partir de la **sous-catégorie** : une pédale de
delay devient `DLY-001`, un micro condensateur `MIC-001`. Un identifiant attribué ne
change jamais, même si l'item est reclassé plus tard.

Toute la taxonomie vit dans `js/config.js` et se modifie sans intervention technique.
Pour ajouter une sous-catégorie : une ligne dans la bonne famille, avec un **code de
3 lettres unique** — ne jamais réutiliser un code déjà employé par des items existants.

## Utilisation

- **En ligne** : le site est hébergé sur GitHub Pages. Ouvrir l'URL suffit.
- **Sur mobile** : la même URL, interface responsive — idéal en tournée ou session mobile.
- **Sélection multiple** : cases à cocher dans l'inventaire ; une barre d'actions
  apparaît en bas dès qu'un item est sélectionné.
- **Exemplaires multiples** : les items nommés « … #1 », « … #2 » sont regroupés en une
  ligne dépliable avec le bilan (disponibles, sortis, à réparer).
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
js/config.js            ⚙️  RÉGLAGES — catégories, textes, seuils, clés Supabase
js/auth.js              Connexion, session, rôles (fonction can())
js/helpers.js           Utilitaires : dates, texte, identifiants, catégories, emplacements
js/db.js                État en mémoire + SEUL fichier qui communique avec Supabase
js/views-dashboard.js   Tableau de bord, et l'envoi direct d'une caisse
js/views-inventory.js   Inventaire : liste, groupes, sélection multiple, fiche, QR, check-in/out
js/views-packs.js       Packs : arbre, fiche, consommables, glisser-déposer
js/views-projects.js    Projets : liste, composition, préparation, réglages
js/views-out.js         Sorties, groupées par caisse et arborescentes
js/views-repairs.js     Réparations : dossiers, prestataires, contrôle au retour
js/views-people-loc.js  Emprunteurs & Emplacements
js/views-trash.js       Corbeille (restauration, purge)
js/views-users.js       Utilisateurs (comptes et rôles, admins uniquement)
js/import-csv.js        Import d'un fichier d'inventaire
js/import-weights.js    Import des poids par marque et modèle
js/photos-bulk.js       Import groupé de photos
js/crop.js              Recadrage carré d'une photo
js/prefs.js             Préférences d'affichage, enregistrées par utilisateur
js/app.js               Navigation, fenêtres, notifications, export/import, démarrage
sql/                    Scripts de la base de données, à exécuter dans l'ordre
tests/                  Les harnais de test — voir tests/README.md
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
| Changer une couleur                         | `css/styles.css`, bloc `:root` — **toutes** les couleurs y sont, et aucune ailleurs |
| Changer les sous-catégories pouvant servir de contenant | `js/config.js` (`CONTAINER_SUBS`) |
| Changer les états du matériel               | `js/config.js` (`CONDS`) — les menus s'y adaptent seuls |
| Ajouter / renommer une catégorie            | `js/config.js` (`CATS`)              |
| Changer le titre, les noms d'onglets        | `js/config.js` (`LABELS`)            |
| Changer le seuil d'alerte (7 jours)         | `js/config.js` (`ALERT_DAYS`)        |
| Changer la durée de la corbeille (30 jours) | `js/config.js` (`TRASH_RETENTION_DAYS`) |
| Forcer l'adresse des QR codes               | `js/config.js` (`APP_URL`, vide = adresse courante) |
| Élargir les droits des stagiaires           | `sql/005-comptes.sql` (`can_edit_inventory`) **et** `js/auth.js` (`STAGIAIRE_CAN`) |
| Corriger un écran                           | `js/views-….js` correspondant        |
| Modifier un enregistrement en base          | `js/db.js`                           |

### Élargir les droits des stagiaires

Les permissions sont centralisées en **un seul point de décision** de chaque côté.
Pour autoriser les stagiaires à créer et modifier du matériel :

1. Dans Supabase (SQL Editor), remplacer dans la fonction `can_edit_inventory()` :
   `select my_role() in ('admin')` par `select my_role() in ('admin','stagiaire')`.
2. Dans `js/auth.js`, ajouter `'edit'` à la liste `STAGIAIRE_CAN` pour que les boutons
   apparaissent.

La première étape suffit à la sécurité ; la seconde ne fait qu'afficher les boutons.

## Base de données (Supabase)

Tables : `items`, `people`, `locations`, `history`, `projects`, `profiles`,
`user_prefs`, `repairs`, `repair_providers`, `packs`, `pack_items`, `pack_extras`.

Les scripts du dossier `sql/` sont **ré-exécutables sans danger** et doivent être joués
dans l'ordre, **un par un, l'éditeur vidé entre chaque** :

1. `001-init.sql` — schéma initial
2. `002-reparations-sousemplacements.sql` — états de réparation + sous-emplacements
3. `003-projets.sql` — projets / tournées
4. `004-corbeille.sql` — suppression réversible
5. `005-comptes.sql` — comptes, rôles et règles d'accès
6. `006-categories.sql` — catégories à deux niveaux

> L'éditeur SQL de Supabase annule tout le script dès qu'une instruction échoue :
> en cas d'erreur, considérer que **rien** n'a été appliqué.

**Sécurité** : les règles sont appliquées côté base (Row Level Security). Une action
interdite est refusée même en contournant l'interface. La clé publique présente dans
`js/config.js` ne donne accès à rien sans compte autorisé. Les opérations lancées
directement depuis l'éditeur SQL contournent volontairement les garde-fous : c'est
la voie de maintenance, réservée à qui a accès au tableau de bord Supabase.

**Configuration Supabase requise** : l'envoi des emails de connexion (Authentication →
SMTP, via un service dédié — le service intégré est plafonné à 2 emails/heure) et
l'adresse du site (Authentication → URL Configuration, Site URL + Redirect URLs).
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

## Tests

```bash
./tests/run.sh          # les vingt harnais
./tests/run.sh t124     # un seul
```

Chaque harnais charge les vrais fichiers de `js/` dans un faux
navigateur et vérifie ce que font leurs fonctions. Aucun ne touche à
Supabase : ils ne demandent ni compte, ni réseau, ni précaution. Ils
vérifient aussi que tous les `?v=` de `index.html` valent
`APP_VERSION` — l'oubli le plus coûteux, parce qu'il livre un mélange
d'ancien et de neuf.

**On ne déploie pas avec un harnais en échec.** Le détail est dans
[tests/README.md](tests/README.md), avec les marches à suivre des
essais manuels — restauration d'une sauvegarde, vérifications sur
tablette — que les harnais ne peuvent pas couvrir.

## Déploiement (mise à jour du site)

1. Uploader le contenu du dossier à la racine du repo GitHub
   (`index.html` + dossiers `css/`, `js/`, `sql/`, `tests/`).
2. **Important** : mettre `APP_VERSION` (en tête de `js/app.js`) et **tous** les
   `?v=` de `index.html` au même numéro, pour forcer les navigateurs à recharger
   les fichiers. `./tests/run.sh` vérifie ce point.
3. **Si la version livre une migration SQL**, la passer dans Supabase *avant* de
   déployer, et après avoir exporté une sauvegarde : le code neuf lit des colonnes
   que l'ancienne base n'a pas.
4. GitHub Pages republie automatiquement en ~1 minute.

⚠️ **`js/config.js` t'appartient** : si une nouvelle version le livre (parce que la
taxonomie y a changé), il faut y recoller ta clé Supabase.

À chaque changement, suivre la checklist de [UPDATE-PROCESS.md](UPDATE-PROCESS.md) :
`APP_VERSION` dans `js/app.js`, `?v=` dans `index.html`, `./tests/run.sh`,
entrée en haut du [CHANGELOG.md](CHANGELOG.md), migration SQL s'il y en a une,
puis commit Git.

**Environnement de test** : un second projet Supabase « bac à sable » permet d'essayer
les migrations et les changements de règles d'accès sans toucher aux données du studio.
À utiliser systématiquement pour toute modification touchant `005-comptes.sql` — c'est
le seul endroit où une erreur peut verrouiller tout le monde dehors.

## Feuille de route

**Prochain chantier**

- **Ranger les items dans les caisses depuis le projet**, de sorte qu'un item
  attribué quitte la liste des disponibles. C'est lui qui dira si l'idée suivante
  vaut le coup.
- **Des recettes qui demandent un modèle** plutôt qu'un exemplaire précis : une
  caisse dirait « 4 × Shure SM57 » au lieu de nommer quatre identifiants. Deux
  recettes ne pourraient alors plus se disputer le même objet, et « en ai-je
  assez ? » deviendrait calculable. Ne concerne que les familles à plusieurs
  exemplaires — câbles, pieds, SM57, DI.

**v2.0 — l'interface**

La structure tient ; c'est la densité et les fenêtres modales qui fatiguent. Le
chantier n'est pas une réécriture : la couche de données ne bouge pas.

- **Une page par objet**, et derrière un engrenage, une page de réglages qui réunit
  ses métadonnées et ses gestes rares. Les projets suivent déjà ce schéma depuis la
  v1.25 ; les packs et les items doivent le rejoindre.
- **Chercher plutôt que filtrer** : une grille de photos et une arborescence dans
  laquelle on entre, au lieu d'un grand tableau qu'on filtre. Le tableau reste, comme
  une vue parmi d'autres.
- **Thème clair, sombre, ou celui du système.** La palette est prête depuis la
  v1.27 : toutes les couleurs vivent dans un seul bloc `:root`, et un thème se
  résume à en écrire un second. Le choix se range dans `user_prefs`, qui existe
  déjà — chacun son réglage.
- Moins de boutons, plus gros, et un seul geste principal par écran.

**Plus tard, non planifié**

- **Planches d'étiquettes QR** à imprimer. Rien ne presse : aucune étiquette n'a
  jamais été posée, et les identifiants sont stables depuis la migration 020.
- **Médias et commentaires** sur une fiche.
- **Déconnexion automatique et journal d'activité.**
- **Écosystème studio** : intégration au portail local, et une sauvegarde
  supplémentaire sur le serveur du studio.
- **Automatisations** : relances pour le matériel en retard, récapitulatif
  hebdomadaire des sorties et des réparations en attente.
