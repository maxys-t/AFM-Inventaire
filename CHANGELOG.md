# Changelog

## [1.17.0] — 2026-10-08

### Ajouté

- **Chaîne de réparation complète**, du signalement au retour. Un dossier
  n'existe qu'à partir d'un incident : les 600 items qui n'ont jamais rien
  eu n'ont pas d'historique de réparation vide.
- **Catégories de pannes** — neuf entrées, une seule liste valable pour un
  câble comme pour un synthé, dans `config.js` donc modifiable sans
  migration. Le texte libre reste, en complément : il se lit, mais il ne
  se compte pas.
- **Prestataires de réparation** (Settings → Repair shops) : coordonnées,
  spécialité, et filtre « tout ce qui est chez X ». Le matériel sorti est
  groupé par atelier plutôt que listé à plat — voir que deux micros
  dorment au même endroit, c'est un coup de fil au lieu de deux.
- **Contrôle au retour** : l'état documenté au départ et l'état constaté
  côte à côte, photo comprise. C'est ce qui permet de dire « la bosse y
  était déjà », et ce qui protège en cas de litige.
- **Une panne peut être signalée sur un item encore sorti.** La réparation
  démarre à son retour, et l'item ne peut pas repartir entre-temps. Au
  check-in, un bandeau rappelle l'incident ouvert.
- **Délai moyen de retour** sur le tableau des réparations — la seule
  statistique utile dès la première année, contrairement aux taux de
  panne. Un dossier dépassant 30 jours passe en orange.

### Modifié

- **`items.cond` ne décrit plus que l'état physique** : `Good`,
  `Marked / worn`, `Out of service`. « En attente » et « en réparation »
  n'en sont plus des valeurs — ce sont des dossiers ouverts.
- **« Out of service » quitte le flux de réparation** : c'est une fin, pas
  une étape. Replié en bas d'écran, consultable d'un clic.
- **Un item parti en réparation est compté comme dehors**, mais hors de
  l'onglet Borrowers et hors de « Check in all » : un atelier n'est pas un
  emprunteur. Son retour passe obligatoirement par la clôture de
  l'incident.
- Un stagiaire peut ouvrir un incident — c'est lui qui constate la panne
  en session — mais pas le clore ni gérer les prestataires. La règle est
  dans la base, pas seulement dans l'écran.

### Base de données

`sql/016-reparations.sql` : tables `repairs` et `repair_providers`, index
unique interdisant deux dossiers ouverts sur un même item, contrainte sur
les valeurs de `cond`, politiques RLS et garde-fou de clôture. Les items
déjà marqués « en attente » ou « en réparation » deviennent des dossiers
ouverts. Sur l'export du 30 septembre, les 648 items sont en « Good » :
la reprise ne touche rien.

### Note technique

Un troisième statut d'item (`repair`) aurait été le choix évident, et il
touchait 44 endroits du code — projets, emprunteurs, compteurs, filtres.
Une réparation est donc une sortie ordinaire portant un `repairId`, ce qui
réutilise toute la mécanique existante et ne demande qu'une exception là
où elle compte : la liste des emprunteurs. Le risque de régression est
sans commune mesure.


## [1.16.2] — 2026-10-06

### Corrigé

- **La vignette d'un item sans photo redevient carrée.** Elle s'affichait
  en rectangle de 36 × 96 px, ce qui faisait grandir la carte de moitié et
  coûtait un item visible à l'écran sur deux. Le substitut portait la
  classe `empty`, déjà utilisée depuis les premières versions pour les
  messages de liste vide — et porteuse d'un `padding:30px 0` qui
  s'ajoutait silencieusement aux 36 px de hauteur. Il porte désormais un
  nom qui n'appartient qu'à lui, et la règle de la vignette neutralise
  tout padding hérité. Trois contrôles automatiques interdisent la
  rechute.

### Nettoyé

- **`css/styles.css` perd 148 lignes sans qu'un seul pixel bouge** : le
  bloc « v1.3 — Photos carrées » y figurait **trois fois à l'identique**,
  et le bloc v1.9.1 était intégralement repris par le v1.9.2 qui le suit.
  Sur les deux en-têtes concernés, la consigne « À COLLER À LA FIN de
  css/styles.css » disparaît : elle s'adressait à un collage manuel, que
  le dépôt rend caduc. Les onze autres restent à nettoyer.

### Note technique

L'incident et les 148 lignes mortes ont la même cause : une feuille de
style construite par empilement de blocs successifs. Chaque bloc était
écrit sans relire les précédents, d'où les doublons — et d'où la collision
de noms, un nom générique comme `empty` ayant toutes les chances d'avoir
déjà été pris. Les classes du rendu mobile sont préfixées `m` pour cette
raison ; `empty` était la seule exception, et c'est elle qui a cassé.

---

## [1.16.1] — 2026-10-06

### Modifié

- **Deux repères par défaut sur la carte mobile** au lieu de trois :
  identifiant et statut. Sur un téléphone de 390 px, une fois la case à
  cocher, la photo et le bouton posés, il reste environ 160 px pour cette
  ligne — le troisième champ s'affichait tronqué, prenant de la place sans
  rien apprendre. L'emplacement restait illisible : autant ne pas le
  promettre. Les deux repères supplémentaires restent ajoutables à la main
  dans le menu « Columns ».

### Corrigé

- **Seul le dernier repère se tronque**, les précédents restent entiers.
  « Acce… » occupait la place d'une information sans en être une.

### Note technique

`sql/015-peaux-consommables.sql` et `supabase/functions/invite-user/index.ts`
rejoignent le dépôt : déployés en production depuis la v1.12 et la v1.15.1,
ils n'y avaient jamais été versionnés.

---

## [1.16.0] — 2026-10-06

### Ajouté

- **Affichage mobile en cartes.** En dessous de 700 px, l'inventaire
  abandonne le tableau pour des cartes de deux lignes : nom et marque,
  puis une ligne de repères. Le tableau redimensionné ne tenait pas sur un
  téléphone : les blocs « libellé : valeur » faisaient trois écrans par
  catégorie.
- **Jeu de colonnes propre au mobile**, indépendant du bureau et plafonné à
  quatre champs. Le mobile héritait jusqu'ici des quinze colonnes du
  bureau — le problème était structurel, pas cosmétique.
- **Infobulles maison** sur les commandes dont le rôle n'est pas évident :
  « Home location », le voyant de sauvegarde, les menus d'en-tête. Appui
  long de 450 ms sur écran tactile.

### Modifié

- **Cibles tactiles agrandies** et réglage propre à la tablette
  (701–1024 px), qui gardait jusqu'ici la mise en page du bureau.

---

## [1.15.2] — 2026-10-05

### Corrigé

- **La position de défilement est préservée** quand on déplie une ligne
  d'item en plusieurs exemplaires. Régression du cadre à défilement
  introduit en v1.13.1 : `renderInv()` le reconstruit, ce qui renvoyait en
  haut de liste. Le défilement est désormais relevé puis rétabli — et
  délibérément remis à zéro sur un tri, un filtre, une recherche ou un
  changement de vue, où revenir en haut est le comportement attendu.

---

## [1.15.1] — 2026-10-04

### Modifié

- **Les peaux de batterie deviennent « Instrument consumables »**,
  sous-catégorie d'Instruments. Les cinq tailles fusionnent en une :
  les seize noms portent déjà leur taille, aucune information n'est perdue.
  16 items renumérotés (`sql/015-peaux-consommables.sql`). La famille
  Consumables est conservée, vide, pour la suite.

### Corrigé

- Le libellé affiché restait `consommable_inst` : la migration n'était
  qu'à moitié déployée, `subLabel()` retombant sur la clé brute.
- Numéro de version de `index.html` oublié : un changement de `config.js`
  reste invisible sans un nouveau `?v=`. Règle désormais systématique.

---

## [1.15.0] — 2026-10-03

### Ajouté

- **Tri et filtres passent dans les en-têtes de colonne.** Un clic trie,
  un menu par en-tête filtre sur les valeurs présentes. Tri sur plusieurs
  niveaux.
- **Bandeau des filtres actifs**, retirables un par un.
- L'état des tris et des filtres est enregistré dans les préférences.

### Modifié

- **L'en-tête de catégorie joue le rôle de séparateur** : plus grand, plus
  visible.
- La barre de sept menus déroulants disparaît, remplacée par les menus
  d'en-tête.

---

## [1.14.0] — 2026-10-02

### Modifié

- **Ordre d'affichage des familles** revu pour suivre la logique du studio
  plutôt que l'ordre alphabétique.
- **Les supports sont éclatés** entre pieds de micro, pieds de clavier et
  mobilier ; le K&M 42020, rack 19", rejoint une nouvelle sous-catégorie
  « Studio racks » du mobilier. 59 items renumérotés
  (`sql/014-rangement-familles.sql`).

### Note technique

Un changement de famille ne touche pas aux identifiants, qui dérivent du
code de sous-catégorie : seules les étiquettes QR des 59 items renumérotés
sont à refaire. La migration a été simulée sur l'export réel de 648 items
avant déploiement : 0 collision, numérotation continue.

---

## [1.13.1] — 2026-10-01

### Ajouté

- **Choix explicite sur les items abîmés d'une sortie groupée.** L'app
  annonce les items concernés et propose de les retirer du lot — option
  mise en avant — ou de les sortir quand même.

### Corrigé

- **Mise en page cassée par la v1.13** : retirer `overflow` de `.invwrap`
  laissait le tableau déborder du panneau et décaler la page vers la
  droite. `.invwrap` redevient un cadre à défilement de hauteur bornée,
  calculée par `syncInvHeight()`.
- L'application occupe désormais toute la largeur du bureau.

---

## [1.13.0] — 2026-09-30
 
### Ajouté
 
- **Blocage de la sortie d'un item signalé en réparation.** Un item en
  « needs repair », « in repair » ou « out of service » ne peut plus être
  sorti ; son bouton est grisé et l'infobulle en donne la raison. Sur une
  sortie groupée, les items concernés sont écartés du lot et leur nombre est
  annoncé.
- **En-têtes collants** : noms de colonnes et séparateurs de catégorie restent
  visibles pendant le défilement de l'inventaire.
### Modifié
 
- **La recherche occupe sa propre ligne**, au-dessus des filtres, sur toute la
  largeur. Elle se perdait auparavant entre sept menus déroulants.
- **Le bouton « + Add item » quitte la barre de filtres** pour rejoindre la
  recherche. Il modifie l'inventaire, alors que les filtres ne font que
  changer l'affichage : les mélanger invitait à la confusion.
- La sélection de texte est désactivée sur les boutons, la navigation et les
  en-têtes, et conservée sur les cellules du tableau et les champs de saisie.
- Le défilement horizontal du tableau n'est plus actif qu'en dessous de
  1100 px de large.
### Corrigé
 
- Derniers libellés restés en français : titre du formulaire d'item, boutons
  « Fermer », messages de confirmation de suppression, « — choisir — » dans
  les menus déroulants. Un test automatique vérifie désormais qu'aucun ne
  réapparaisse.
- Commentaire obsolète dans `views-users.js`, qui affirmait encore qu'aucun
  passage par Supabase n'était nécessaire pour créer un compte — faux depuis
  la v1.12.
### Note technique
 
Le conteneur à défilement horizontal introduit en v1.10 neutralisait
`position: sticky` : dès qu'un axe de défilement cesse d'être « visible », le
navigateur rend l'élément défilant sur les deux axes, et les en-têtes se
collent au conteneur plutôt qu'à la page. Le décalage vertical est mesuré en
JavaScript, la hauteur de l'en-tête du site variant selon la largeur de fenêtre.
 
---
 
## [1.12.2] — 2026-09-29
 
### Corrigé
 
- **La restauration JSON ne perd plus de données.** `normalizeImport()` et les
  écritures associées n'avaient pas suivi les évolutions des v1.11 et v1.12.
  Une restauration rendait l'inventaire complet mais perdait :
  - les adresses des lieux et leur type (site, salle, off-site) ;
  - les archivages de lieux et de projets ;
  - la destination et les dates des projets ;
  - l'auteur des lignes d'historique.
- L'import accepte trois formats : l'export de l'application, les sauvegardes
  nocturnes du dépôt, et les sauvegardes antérieures à la migration 013 —
  l'adresse en champ libre y est reversée dans le champ « rue » au lieu d'être
  jetée.
### Note
 
Les fichiers de sauvegarde, eux, étaient complets : le script nocturne lit
toutes les colonnes. Seul le chemin de relecture dans l'application était en
cause. Ce chemin est désormais couvert par 27 vérifications automatiques.
 
---
 
## [1.12.1] — 2026-09-28
 
### Ajouté
 
- **Deux nouveaux niveaux de correspondance pour l'import groupé de photos** :
  `Cordial XLR.jpg` habille tous les câbles XLR d'une marque quelle que soit
  leur longueur, `XLR.jpg` toute la sous-catégorie. La sous-catégorie se
  désigne par son libellé ou par son code.
- **Arbitrage par précision** : le fichier le plus précis l'emporte. Déposer
  `Cordial XLR.jpg` et `XLR 3m.jpg` ensemble n'est pas un conflit — les câbles
  de 3 m gardent leur photo dédiée, les autres prennent la générique. Deux
  fichiers de même niveau visant les mêmes items restent signalés comme
  conflit.
### Modifié
 
- L'aperçu avant envoi indique le niveau de correspondance et le nombre exact
  d'items couverts. Une correspondance large est signalée en orange, avec un
  avertissement en tête de tableau et un récapitulatif dans la confirmation.
- L'export « Expected file names » liste deux séries : un nom par modèle, et un
  nom par marque et sous-catégorie, avec le nombre d'items couverts.
---
 
## [1.12.0] — 2026-09-25
 
### Ajouté
 
- **Connexion par mot de passe.** Écran email + mot de passe, avec
  « Forgot password? » en secours. Changement du mot de passe depuis
  Settings → Account.
- **Invitations** (nouvelle Edge Function `invite-user`). Un administrateur
  invite une adresse depuis Settings → Users ; la personne reçoit un mail et
  choisit son mot de passe. La fonction revérifie côté serveur que l'appelant
  est administrateur avant de créer quoi que ce soit.
- **Adresses détaillées** (migration `013`) : rue, complément, code postal,
  ville, et téléphone de contact sur les lieux off-site. Saisie dans une
  fenêtre dédiée. Le mail de livraison sort l'adresse sur plusieurs lignes.
- **« Check in all »** dans l'onglet Borrowers : rentre tout le matériel d'une
  personne en une fois, via la même fenêtre d'état que le retour groupé.
### Modifié
 
- **Le lien magique disparaît de l'interface.** Il n'y a plus d'inscription :
  un compte n'existe que parce qu'un administrateur l'a créé.
- **L'onglet Borrowers affiche un tableau** au lieu d'une rangée de pastilles :
  item, identifiant, sorti depuis, retour prévu, destination, et un bouton de
  retour individuel. Les retards sont surlignés.
- Le message d'échec de connexion reste volontairement vague : distinguer
  « mauvais mot de passe » de « adresse inconnue » révélerait qui travaille au
  studio à n'importe quel visiteur.
- Le retour groupé depuis l'onglet Borrowers n'utilise plus la sélection de
  l'inventaire, qui reste intacte.
### Sécurité
 
- La création de comptes passe par du code serveur : elle exige la clé secrète
  Supabase, qui n'a pas sa place dans un site statique.
- Réglages à activer côté Supabase : longueur minimale de 10 caractères,
  exigences de caractères, et surtout **désactivation de l'inscription
  publique** — c'est ce dernier point qui ferme réellement la porte.
- La détection des mots de passe compromis (HaveIBeenPwned) est réservée au
  plan Pro de Supabase et reste donc désactivée. La longueur minimale compense
  le gros du risque ; subsiste celui d'un mot de passe réutilisé depuis une
  fuite survenue ailleurs.
### Notes de migration
 
L'ordre compte : se donner un mot de passe et vérifier qu'il fonctionne
**avant** de couper l'inscription publique. Le fichier `A-LIRE.txt` détaille
la marche à suivre et la procédure de secours en cas de blocage.

## [1.11.0] — 2026-09-25

### Ajouté

- **Lieux Off-site** (migration `012`). Un encadré dédié dans Settings →
  Locations pour les adresses extérieures : salle de concert, client, tournage.
  Créée une fois, une adresse se réutilise pour toutes les dates suivantes.
  Un off-site peut être destination d'une sortie de matériel ou d'un projet,
  mais jamais le rangement habituel d'un item.
- **Adresse sur les sites et les off-site.** C'est elle qui alimente les mails
  de livraison.
- **Archivage** des lieux off-site et des projets. L'élément sort des menus
  déroulants sans être supprimé : l'historique continue de le nommer, et un
  bouton « Show archived » le fait réapparaître. Refusé tant que du matériel
  est encore sur place.
- **Destination et dates sur les projets**, visibles en colonnes dans la liste.
  Les dates vivent sur le projet et non sur le lieu, ce qui permet de réutiliser
  la même adresse d'une date à l'autre.
- **Brouillon de mail de livraison** (« ✉️ Delivery details » sur la fiche d'un
  projet) : ouvre dans le logiciel de mail un message pré-rempli avec la
  destination, l'adresse, les dates et la liste du matériel groupée par
  catégorie. Volontairement un brouillon relu par un humain, pas un envoi
  automatique.
- Suggestions d'adresses extérieures au moment de sortir du matériel. Le champ
  reste libre ; la liste évite seulement les variantes d'orthographe.

### Modifié

- **Toutes les dates s'affichent en `AAAA/MM/JJ`.** Format non ambigu et qui se
  classe correctement dans un tri alphabétique. L'import CSV continue
  d'accepter les écritures jour/mois/année.
- **Les emplacements se limitent à deux niveaux** : un site (bâtiment, avec
  adresse) contient des salles. La migration marque les emplacements de premier
  niveau existants comme des sites.
- Le rangement habituel d'un item et le déplacement groupé ne proposent plus que
  des sites et des salles.
- **Import / export JSON retirés de la barre du haut** : ils restent dans
  Settings → Data, où ils étaient déjà présents en double.
- Suppression d'un lieu refusée si un projet y fait référence, avec invitation à
  l'archiver plutôt.

### Notes de migration

Sans la migration `012`, l'application démarre normalement et traite les
emplacements existants comme des sites et des salles, mais les adresses,
l'archivage et les destinations de projet restent inopérants.


## [1.10.0] — 2026-09-25

### Ajouté

- **Colonnes configurables dans l'inventaire.** Bouton « Columns » permettant
  d'afficher ou de masquer chaque colonne. Quinze colonnes disponibles :
  photo, item, ID, catégorie, famille, statut, emplacement, rangement habituel,
  état, propriétaire, fournisseur, prix d'achat, date d'achat, n° de commande,
  n° de série. Sept sont visibles par défaut.
- **Mémorisation des préférences par compte** (nouvelle table `user_prefs`,
  migration `011`). Les colonnes choisies suivent la personne d'un appareil à
  l'autre. Une copie en `localStorage` sert au premier rendu pour éviter le
  clignotement au chargement.
- **Bouton « Reset filters »** : vide la recherche, les filtres et le tri.
  Désactivé tant qu'aucun filtre n'est actif.
- **Séparateurs de section** dans la liste lorsqu'un tri est actif : lettre
  pour les noms, code pour les ID, famille pour les catégories, lieu pour les
  emplacements, tranches pour les prix, mois pour les dates d'achat. Les items
  sans valeur sont regroupés en fin de liste.
- Repère visuel sur la colonne « Home » lorsqu'un item ne se trouve pas à son
  rangement habituel.

### Modifié

- **Hauteur des lignes d'inventaire divisée par deux.** Les cellules
  n'empilent plus deux informations : l'ID, la famille et le rangement
  habituel sont devenus des colonnes à part entière. Le texte trop long est
  tronqué avec une infobulle au survol plutôt que renvoyé à la ligne.
- La vue inventaire s'élargit à 1380 px pour accueillir les colonnes
  supplémentaires ; le tableau défile horizontalement au-delà.
- Le prix d'achat reste réservé aux administrateurs : il n'apparaît ni dans le
  tableau ni dans le menu de sélection des colonnes pour les autres comptes.

### Corrigé

- L'abonnement temps réel écoutait l'ensemble du schéma. Chaque écriture de
  préférence d'affichage aurait déclenché un rechargement complet de
  l'inventaire. L'abonnement est désormais limité aux tables de données.

### Sécurité

- Les préférences sont stockées dans une table `user_prefs` distincte de
  `profiles`. Ouvrir l'écriture sur `profiles` aurait permis à un compte de
  modifier son propre rôle et de s'attribuer les droits d'administration.
  Chaque compte n'écrit que dans sa ligne de `user_prefs`, qui ne contient
  aucun droit.


## [1.9.2] — 2026-09-23
### Modifié
- **Borrowers** : le matériel de chaque emprunteur se déplie au clic au lieu de
  s'étaler. « Currently holding » devient « Currently using ». Le nombre d'items
  en retard est visible sans déplier, et la liste est triée du plus ancien.
- **Dashboard** : Items available, Items checked out, Items needing repair.
### Corrigé
- Les durées affichaient encore « j » au lieu de « d ».

## [1.9.1] — 2026-09-23
### Modifié
- **Settings** réorganisé en menu latéral : Account, Data, Locations, Users,
  Activity, About, et Sign out détaché en bas en rouge.
- **Codes d'identifiant alignés sur l'anglais** (migration `010`) : 29 codes
  changent, 156 items renommés et renumérotés, historique et projets mis à jour.
  MIC→MCN, PIE→MST, CAS→HPH, ORD→CPU, ALP→PSU, HOU→BAG, MOB→FRN, P14→H14…
### Corrigé
- Les filtres Owner et Provider affichaient encore « : tous ».

## [1.9.0] — 2026-09-23
### Modifié
- **Interface entièrement en anglais**, y compris les catégories, les états et les
  statuts de projet. L'import CSV accepte toujours les anciens libellés français.
- **Navigation resserrée** : Dashboard · Inventory · Borrowers · Projects ·
  Checked out · Repairs · Settings. Emplacements, comptes, import/export,
  corbeille et journal d'activité regroupés dans Settings.
- **Tableau de bord refait** : présentation de l'app, actions rapides, bloc
  « Needs attention » conditionnel, chiffres cliquables vers l'inventaire filtré.
  La valeur d'achat cumulée n'est visible que des administrateurs.
- Une phrase d'explication sous le titre de chaque écran.
- Au check-out, l'emprunteur se saisit librement avec suggestions et création
  automatique ; l'onglet Personnes devient **Borrowers**.
- « Import CSV » et « Import photos » quittent la barre de l'inventaire pour
  Settings › Data ; l'en-tête ne garde que le rafraîchissement.

## [1.8.0] — 2026-09-23
### Modifié
- **Sélecteur de matériel des projets** refait en navigation par dossiers
  (familles → sous-catégories → items), avec compteurs sélectionnés/total sur
  chaque dossier, « tout cocher » par dossier, recherche à plat sur tout
  l'inventaire (nom, identifiant, catégorie, n° de série) et pastilles de
  sélection retirables. Lignes compactes avec vignette.
- **Checklist de projet** groupée par sous-catégorie, avec progression par groupe.

## [1.7.0] — 2026-09-21
### Ajouté
- **Tri de l'inventaire** croissant/décroissant par nom, identifiant, catégorie,
  emplacement, état, prix d'achat, date d'achat, propriétaire ou fournisseur.
  Les valeurs non renseignées restent en fin de liste.
- **Filtres propriétaire et fournisseur**, alimentés par les valeurs présentes,
  avec une entrée « non renseigné ».
- Ligne de résumé : nombre d'items affichés, sorties en cours et **valeur d'achat
  cumulée** de la sélection en cours.

## [1.6.0] — 2026-09-21
### Ajouté
- **Import groupé de photos** : association par nom de fichier (modèle, marque + modèle
  ou identifiant), recadrage carré automatique, aperçu avant envoi, doublons signalés.
  Export de la liste des noms de fichiers attendus.
- Les photos sont désormais stockées comme fichiers dans Supabase Storage
  (migration `009`) : la fiche ne contient qu'un lien, l'inventaire reste rapide
  avec des centaines d'images. Outil de reprise des photos enregistrées auparavant.
### Modifié
- Les lignes de groupe affichent la photo commune ; toutes les images se chargent
  en différé.

## [1.5.0] — 2026-09-21
### Ajouté
- Familles **Consoles** (console, extension, carte I/O), **Mesure**, et sous-catégories
  Accessoire micro, Micro de mesure, Trigger, Châssis 500, Accordeur,
  Footswitch / expression, Ampli casque, Réseau, Interface MIDI, Patchbay,
  Électricité / alimentation, peaux de batterie par taille (10" à 22").
- Champs **n° de commande** et **date d'achat** sur la fiche (migration `008`),
  cherchables et exportables, réservés aux administrateurs.
- Import CSV : colonnes `Sales order #` et `Purchase date`, dates acceptées en
  jj/mm/aaaa, aaaa-mm-jj ou jj.mm.aaaa ; une date illisible est signalée, pas devinée.
### Modifié
- **Câblage & connectique** détaillé par connecteur : XLR, TRS, Mini TRS, TS, Mini TS,
  RCA, XLR F / TRS, XLR M / TRS, Câble secteur, MIDI, Multipaire audio, Adaptateur,
  Patchbay. « Câble jack » et « Câble instrument » disparaissent.
- Identifiants des câbles XLR en `XLR-001` (au lieu de `CAB-001`).
- Modèle et export CSV alignés sur ce format.

## [1.4.0] — 2026-09-02
### Ajouté
- Trois champs sur la fiche : **propriétaire**, **fournisseur**, **prix d'achat**
  (migration `007`). Cherchables ; réservés aux administrateurs comme le reste de la fiche.
- Import CSV : nouveau modèle dans l'ordre du tableur du studio
  (Categorie, Sous Categorie, Manufacturer, Item, Owner, Serial #, Provider, Quantity,
  Purchase Price) ; **emplacement par défaut** choisi à l'import pour les lignes qui n'en ont pas.
### Modifié
- Export CSV aligné sur le nouveau modèle.

## [1.3.0] — 2026-09-02
### Ajouté
- **Recadrage carré des photos** : cadre, déplacement et zoom au moment de l'ajout ;
  bouton « Recadrer » sur les photos existantes. Toutes les photos s'affichent en
  carré, y compris les anciennes.
- **Import CSV** : modèle téléchargeable, aperçu détaillé avec erreurs signalées
  ligne par ligne, création et mise à jour (par identifiant), création confirmée des
  emplacements manquants, colonne quantité pour les lots. Rien n'est écrit avant
  confirmation. Tolérant sur les séparateurs, les accents et les états écrits en
  langage courant.
- **Export CSV** de l'inventaire, au même format que l'import — permet de corriger
  en masse dans un tableur puis de réimporter.
### Modifié
- Affichage des items façon catalogue : **fabricant** en gras suivi du modèle, dans
  tous les écrans. Le champ « Marque / modèle » devient « Manufacturer », et « Nom »
  devient « Modèle ».
### Corrigé
- Catégorie mal affichée dans la corbeille depuis le passage aux catégories à deux niveaux.

## [1.2.0] — 2026-08-09
### Ajouté
- **Catégories à deux niveaux** (10 familles, 43 sous-catégories), les deux
  obligatoires à la création d'un item. Menus en cascade, filtres en cascade.
- Action groupée « Catégorie » pour reclasser plusieurs items d'un coup.
### Modifié
- Les identifiants se basent désormais sur la sous-catégorie (DLY-001, MIC-001…).
  Les identifiants déjà attribués restent inchangés.
- La recherche trouve aussi par libellé de catégorie.

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
