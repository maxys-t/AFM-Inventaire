# Changelog

## [1.1.0] — 2026-08-09
### Ajouté
- **Sélection multiple** dans l'inventaire : check-out et check-in groupés,
  changement d'emplacement ou d'état en lot, mise à la corbeille groupée.
- **Regroupement des exemplaires** d'un même modèle en ligne dépliable, avec
  bilan agrégé (disponibles, sortis, à réparer).
- **QR codes menant à la fiche de l'item** : scanner ouvre l'app sur l'item, prêt
  pour un check-out. Fonctionne même déconnecté (la fiche s'ouvre après connexion).
- Bouton « Tout supprimer définitivement » dans la corbeille.
### Modifié
- Les actions groupées n'envoient qu'une requête pour tout le lot.

## [1.0.0] — 2026-08-09
### Ajouté
- **Comptes utilisateurs** : connexion du personnel par lien magique (email, sans
  mot de passe). L'application n'est plus accessible sans compte autorisé.
- **Rôles** : administrateur (tous les droits) et stagiaire (consultation,
  check-out / check-in, signalement de réparations, préparation des projets).
- **Écran Utilisateurs** réservé aux admins : autoriser un email, changer un rôle,
  désactiver ou retirer un compte — sans passer par Supabase.
- **Historique signé** : chaque action indique qui l'a effectuée.
### Modifié
- Les règles de sécurité sont désormais appliquées côté base de données : une action
  interdite est refusée même en contournant l'interface.
### Sécurité
- Fin de l'accès anonyme : posséder l'URL du site ne suffit plus pour voir ou modifier
  l'inventaire.
  
## [0.7.0] — 2026-07-27
### Ajouté
- **Corbeille** : un item supprimé n'est plus effacé, il reste récupérable 30 jours
  avec tout son historique. Bouton 🗑 dans l'en-tête (visible seulement si elle
  contient quelque chose), avec restauration ou suppression définitive.
- **Sauvegarde automatique quotidienne** de la base dans un repo privé dédié
  (GitHub Actions), 90 jours de sauvegardes datées conservées.
- **Confirmation visuelle des enregistrements** et messages d'erreur explicites
  en cas d'échec, avec bouton de rechargement.
- **Détection de la perte de connexion** : pastille rouge clignotante, alerte, et
  rechargement automatique au retour du réseau.
### Modifié
- Après un échec d'enregistrement, l'application se resynchronise avec la base pour
  ne jamais afficher une action qui n'a pas été enregistrée. La fenêtre reste ouverte
  et la saisie est conservée.
- L'export inclut désormais les items de la corbeille, pour être une image complète
  de la base.
- Les boîtes de dialogue bloquantes sont remplacées par des notifications discrètes.
### Corrigé
- L'import accepte les fichiers de sauvegarde automatique (format base de données),
  en plus des exports manuels de l'application.

## [0.6.2] — 2026-07-25
### Modifié
- Update Feuille de route dans READ ME
  
## [0.6.1] — 2026-07-24
### Modifié
- Nouvelle palette de couleurs : thème sombre façon Apple (dark mode).
- Clés Supabase supprimés dans config.js

## [0.6.0] — 2026-07-24
### Modifié
- Réorganisation complète du code en fichiers séparés (aucun changement
  fonctionnel) : `css/styles.css`, `js/config.js`, `js/helpers.js`, `js/db.js`,
  un fichier par écran (`views-*`), `js/app.js`.
- Toutes les communications avec Supabase regroupées dans `db.js` (fonctions `api*`) :
  les vues ne parlent plus à la base directement.
- Textes de l'interface et réglages centralisés dans `config.js` (`CATS`, `LABELS`,
  `ALERT_DAYS`…) pour une personnalisation facile.
- Scripts SQL versionnés dans `sql/` (001, 002, 003).
### Ajouté
- `README.md` (présentation, architecture, guide de modification) et ce `CHANGELOG.md`.
- Paramètre de version (`?v=`) sur les fichiers pour forcer le rechargement du cache
  navigateur à chaque mise à jour.

## [0.5.0] — 2026-07-23
### Ajouté
- **Projets / tournées** : création de templates réutilisables regroupant une liste
  fixe de matériel, avec description et date de dernière utilisation.
- Trois statuts de projet (Inactif → Préparation → Show) avec checklist de préparation
  et barre de progression.
- Passage en mode « Show » : check-out automatique de tout le matériel du projet
  (emprunteur = le projet), indisponible pour un autre emprunt.
- Clôture du show : check-in automatique de tout le matériel, retour aux emplacements
  de référence, projet réutilisable ensuite.
- Filtre par projet dans l'écran Sortis.
- **Quantité à l'ajout** : création en lot d'exemplaires numérotés automatiquement
  (ex : « Câble XLR 5m #1, #2, #3 »), chacun avec son identifiant et son historique.

## [0.4.0] — 2026-07-23
### Ajouté
- Date de retour prévue au check-out, avec case d'activation d'alerte.
- Alertes de retard sur le tableau de bord, l'inventaire et l'écran Sortis.
### Modifié
- Interface entièrement refondue façon Apple (thème clair à l'époque, en-tête
  translucide, navigation en pilules, typographie SF).
- Une seule fenêtre (modale) ouverte à la fois pour fluidifier l'usage.
- En-tête renommé « AFM Inventory Tracker ».
### Corrigé
- Création de sous-emplacements en série (le rafraîchissement temps réel réinitialisait
  le formulaire pendant la saisie).

## [0.3.0] — 2026-07-23
### Ajouté
- Écran **Réparations** : matériel en attente de réparation, en réparation, ou hors
  service, avec transitions entre états et journal détaillé.
- **Sous-emplacements** : hiérarchie lieu › sous-emplacement (ex : Studio A › Rack
  synthés), avec filtrage par lieu incluant ses sous-emplacements.
- Filtres de recherche dans l'écran Sortis (texte, catégorie, personne, ancienneté).
### Modifié
- Thème clair (première refonte visuelle, avant le passage complet façon Apple).
- L'état « à réparer » devient « en attente de réparation ».

## [0.2.0] — 2026-07-23
### Ajouté
- Passage à **Supabase** : données partagées en temps réel entre tous les utilisateurs.
- Écran de connexion (URL + clé du projet), puis identifiants intégrés à l'application.
- Bouton « Actualiser » et pastille de connexion.
### Modifié
- Les données ne vivent plus seulement dans le navigateur (localStorage) mais dans une
  base partagée. L'export / import JSON reste disponible.

## [0.1.0] — 2026-07-23
### Ajouté
- Première version : inventaire du matériel (ajout / modification / suppression,
  catégories, état, photo, notes, identifiant unique par item).
- Système de check-out / check-in avec historique daté par item.
- Emplacements de référence et emplacement actuel.
- Liste des personnes empruntant le matériel.
- Recherche et filtres, tableau de bord, étiquettes QR imprimables.
- Stockage local (navigateur) avec export / import JSON.
