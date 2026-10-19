# Changelog

## [2.0.1] — 2026-10-19

Dix corrections sur ce que l'essai de la v2.0 a montré. Aucune
migration SQL.

### Corrigé

- **La largeur changeait d'un onglet à l'autre.** Certaines vues
  étaient bridées à 1 100 px, d'autres prenaient l'écran : passer de
  l'une à l'autre faisait sauter la page, et deux réglages voisins
  n'avaient pas la même marge. Le rail ayant déjà pris sa part, le
  contenu prend le reste — **partout, et sans condition**. Seuls les
  textes longs gardent une largeur de lecture.

- **Deux engrenages se chevauchaient** dans le rail : l'icône dessinée
  et un pictogramme laissé dans le libellé.

- **Impossible de supprimer une date** d'un projet : Safari n'offre
  aucun moyen de vider un champ date. Ce n'était pas la logique — elle
  accepte le vide depuis toujours — mais l'absence d'un bouton. Un
  **Clear** apparaît à côté d'une date posée.

- **La fiche d'un item se coupait en deux** sur les lignes longues :
  un libellé poussait la valeur à la ligne. La colonne des libellés
  est bornée, et c'est elle qui se replie.

### Changé

- **Les deux gestes qui comptent passent en haut à droite** de la
  fiche : *Check out* et *Report a fault*. Modifier, imprimer et jeter
  descendent en pied de fiche, où l'on ne tombe pas dessus par
  accident.

- **Start packing passe en haut à droite** de l'écran projet. Il était
  sous la liste : il fallait défiler jusqu'au bout pour lancer une
  préparation.

- **La corbeille descend au bas du rail**, avec le même trait que ses
  voisines. C'est un rangement, pas une action de l'en-tête.

- **Le tableau de bord passe en deux colonnes.** À gauche, large, ce
  qui demande une action — les alertes, puis les projets en cours. À
  droite, étroit, ce qui s'observe. Tout s'empilait, et il fallait
  défiler pour savoir si quelque chose clochait : c'est pourtant la
  première question qu'on pose en arrivant.

- **Deux icônes redessinées** : une clé et un tournevis croisés pour
  les réparations, une guitare pour les projets. Une clé seule et un
  fanion ne disaient rien du métier.

### Corrigé — le téléphone

Trois défauts sur un écran de 390 px :

- L'**en-tête** occupait un tiers de la hauteur, avec quatre boutons
  sur trois lignes. Qui on est et la déconnexion partent dans les
  réglages, où l'on va de toute façon pour les changer.
- Les **libellés de la barre basse se chevauchaient** — huit
  destinations à 48 px chacune. Ils disparaissent ; seule la
  destination courante garde le sien, ce qui suffit à apprendre une
  icône au moment où on l'active.
- Le **bloc d'accueil** répétait un titre et une phrase d'explication
  écrits pour quelqu'un qui découvre l'application, pas pour celui qui
  l'ouvre douze fois par jour.

### À venir

Le **mode packing non linéaire** — bandeau des caisses, composition
figée au lancement — sera la v2.1.0.


## [2.0.0] — 2026-10-19

Aucune migration SQL. **Ce que l'application calcule et affiche ne
change pas** : seule la façon d'y arriver change. Les vues écrivent
dans les mêmes conteneurs qu'hier, et la couche de données n'a pas
bougé d'une ligne.

### Changé — un rail de navigation

La barre horizontale plafonnait à sept onglets, et l'application doit
pouvoir en accueillir d'autres. Un **rail à gauche** a de la place,
reste visible, et libère le haut de l'écran.

- Il **groupe explicitement** ce qui sert à faire partir du matériel —
  Projects, Packs, Checked out — et ce qui décrit le parc — Inventory,
  Repairs, Borrowers. L'ordre dit la hiérarchie du travail : le projet
  est la fin, tout le reste existe pour le servir.
- Il **se replie en icônes** à la demande, et tout seul sous 1000 px.
  C'est là, et seulement là, que des icônes de navigation se
  justifient : apprises une fois, répétées à chaque écran. Aucune
  icône n'a été inventée pour une catégorie — il y en a 73, elles
  auraient coûté leur place pour rien.
- **Sur téléphone, il devient une barre basse**, là où le pouce
  arrive. Un rail de 60 px sur un écran de 375 px, ce serait un
  sixième de la largeur pour une navigation qu'on utilise six fois par
  jour.
- Le choix replié/déplié **se range dans les préférences** de chacun,
  comme les colonnes de l'inventaire.

Le rail, l'en-tête et le contenu vivent désormais dans une seule
coquille, montrée ou cachée d'un bloc. Trois éléments synchronisés à
la main finissaient par diverger.

### Ajouté — thème clair, sombre, ou celui du système

- **Settings → Appearance.** Trois choix, et le troisième n'est pas un
  compromis : « System » suit le réglage de l'appareil, **y compris
  quand il bascule tout seul** au coucher du soleil — on écoute le
  changement au lieu de le lire une fois au démarrage.
- Le thème appartient à la personne, pas à l'appareil : il suit son
  compte. Deux personnes du studio peuvent travailler côte à côte avec
  des réglages différents.
- Le thème clair n'est pas le sombre « éclairci » : les surfaces
  s'inversent, et les couleurs de sens sont assombries pour rester
  lisibles sur du blanc — l'ambre et le vert du thème sombre
  disparaîtraient sur fond clair.

C'est la v1.27 qui a rendu ceci possible : toutes les couleurs vivant
dans un seul bloc, un thème tient dans un second. Le harnais vérifie
maintenant que **les deux palettes définissent exactement les mêmes
variables** — une variable manquante laisserait l'autre thème
transparaître à cet endroit, et c'est introuvable à la relecture.

### Changé — la fiche d'un item

Elle reste une fenêtre : c'est le bon contenant pour regarder un objet
sans quitter la liste. Mais son contenu était une colonne unique de
trois mètres, où les chiffres qui comptent étaient noyés dans un
paragraphe.

- Un **bandeau de quatre chiffres** — état, poids, où il est, nombre
  de sorties — puis des **cartes thématiques côte à côte** : Identité,
  Rangement, Achat, Notes, Historique.
- Rien n'a été retiré : le harnais vérifie nommément que le numéro de
  série, le propriétaire, le conditionnement et le fournisseur sont
  toujours là.

### Ajouté

- **`tests/t200.js`**, sept sections, dont une qui vérifie que les huit
  conteneurs de vues existent toujours — c'est la promesse de cette
  version. Vingt et un harnais au total.

### Reste pour plus tard

Le rail de filtres sur l'inventaire — familles, états et emplacements
visibles en permanence à côté de la liste. Les menus d'en-tête
fonctionnent ; on verra à l'usage si le rail apporte vraiment quelque
chose.


## [1.29.1] — 2026-10-16

### Changé — le projet passe devant la caisse

L'ordre de la barre dit la hiérarchie du travail. **Le projet est la
fin** : c'est lui qui part, et les caisses comme l'inventaire
existent pour le servir. La barre le dit désormais —
Dashboard · **Projects** · Packs · Inventory · Checked out · Repairs ·
Borrowers — et c'est Projects qui porte la mise en avant.

- Le tableau de bord ouvre sur **+ New project**, et un bloc **In
  progress** liste ce qui se prépare ou ce qui roule, avec sa
  progression, **avant** le bloc des caisses. Il ne s'affiche que
  s'il y a quelque chose en cours : un panneau vide en permanence
  n'apprend rien et prend la place de ce qui en apprend.

### Ajouté

- **Les photos des deux côtés de la composition.** La colonne de
  gauche en avait perdu : les modèles montrent la photo du premier
  exemplaire qui en a une, les caisses celle de leur contenant, et
  l'en-tête d'une caisse la reprend à droite. On reconnaît un objet
  avant d'avoir lu son nom.

- **Ajouter un consommable à une caisse depuis le projet.** Même règle
  que les items depuis la v1.29 : ce qu'on met dans une caisse y
  reste. Si l'on pense au gaffer en préparant une tournée, c'est qu'il
  manquait à la recette — et il manquera encore la fois suivante si on
  ne l'y met pas. Le formulaire reste replié derrière un
  **+ Consumable**, avec annulation.


## [1.29.0] — 2026-10-16

**Migration SQL à passer : `sql/028-rangements-retires.sql`**, après
la 027 de la veille.

### Changé — une caisse, c'est ce qu'il y a dedans

La v1.28 permettait de ranger un item dans une caisse **pour un
projet seulement**, sans toucher à sa recette. L'idée n'a pas survécu
à la question « donne-moi un cas concret » : il n'y en avait pas.

L'application ne peut pas savoir si l'objet ressort de la caisse au
déballage — seule la personne qui déballe le sait. Prétendre le
contraire obligeait à refaire le même geste à chaque tournée, au lieu
de converger vers des recettes justes. Et si l'on ressent le besoin
d'ajouter un item en urgence dans une caisse, c'est justement qu'à la
sortie suivante il faut qu'il soit prévu dans la checklist.

- **Lâcher un objet sur une caisse l'y met pour de bon.** La recette
  de la caisse le contient, il part avec elle la prochaine fois, et
  c'est vérifiable en l'ouvrant. Un **Undo** reste proposé douze
  secondes.
- L'item quitte la liste des items isolés du projet : il est désormais
  apporté par la caisse, le laisser des deux côtés le compterait deux
  fois.
- La mention **« added for this project »** disparaît, et avec elle la
  troisième sorte de ligne dans une caisse.
- La colonne `projects.placements` est retirée. Une colonne
  inutilisée finit toujours par être réemployée pour autre chose,
  trois ans plus tard, par quelqu'un qui n'aura pas lu le commentaire.

### Corrigé

- **Chaque dépôt renvoyait la colonne de gauche tout en haut.**
  Redessiner l'onglet remplace son contenu, et les colonnes qui
  défilent repartent du début — on se retrouvait catapulté au sommet
  de la liste après chaque item ajouté. Les trois positions de
  défilement (les deux colonnes et la page) sont maintenant relevées
  avant et reposées après. Changer d'écran, lui, remonte toujours en
  haut : c'est voulu.


## [1.28.1] — 2026-10-16

### Changé

- **« + New case » passe en tête de la liste des caisses**, avant les
  existantes et séparé par un filet. On cherche d'abord une caisse qui
  convient ; c'est quand on n'en trouve pas qu'on regarde en haut, pas
  après avoir fait défiler toutes celles qui ne conviennent pas.


## [1.28.0] — 2026-10-16

**Migration SQL à passer : `sql/027-rangements-projet.sql`.** Elle ne
modifie aucune donnée.

### Ajouté — ranger les items d'un projet dans ses caisses

Un projet mêle des caisses et des items isolés. Les caisses savent ce
qu'elles contiennent ; les items isolés ne savaient rien. Ils
partaient « en vrac », et c'était à celui qui charge de se souvenir où
il les avait mis — puis de le redécouvrir au déchargement.

- **On range un item dans une caisse en l'y glissant.** Dans la
  composition, chaque caisse s'allume quand le doigt la survole :
  déposer dessus range dedans, déposer à côté ajoute simplement au
  projet. Un item de l'inventaire lâché directement sur une caisse y
  atterrit du même geste — ajouté au projet et rangé.

- **La recette de la caisse n'est pas touchée.** La Pelicase ne
  contient toujours pas ce pied ; c'est **ce projet-ci** qui dit qu'il
  voyage dedans. La tournée suivante repart du réel. Les items rangés
  s'affichent sous **Added for this project**, et un ⤺ les ressort.

- **La checklist les demande avec leur caisse**, plus trois sections
  plus bas, et le poids de la caisse les compte. Au départ, le gel
  enregistre le chargement réel — recette et rangements confondus :
  c'est ce qui est parti qui compte, pas la distinction entre les
  deux.

- **Retirer une caisse du projet libère ce qu'on y avait rangé** : les
  items retombent en vrac, et l'application le dit. Un rangement qui
  désignerait une caisse absente est ignoré plutôt que de faire
  disparaître l'item.

Un item ne peut être rangé que dans une caisse à la fois — la forme
même de l'enregistrement l'impose, une clé pour une valeur. C'est
exactement le genre de contradiction qu'on ne veut pas pouvoir
écrire.

### Ajouté — monter une caisse sans quitter le projet

- Sous l'onglet Packs de la composition, un bouton **+ New case**
  ouvre le même formulaire que l'onglet Packs — nom, contenant, monté
  ou configuration — et la caisse rejoint le projet une fois créée.

  **C'en est une vraie** : elle vit dans l'onglet Packs et resservira.
  Pas de contenant jetable visible nulle part ailleurs — ce serait une
  seconde sorte de caisse, et c'est exactement le genre de doublon de
  concept qui avait rendu la v1.20 illisible.

  À ne pas confondre avec les rangements ci-dessus : **ranger** un
  item dans une caisse ne touche pas à sa recette et ne vaut que pour
  ce projet ; **créer** une caisse, si.

### Ajouté

- **`tests/t128.js`**, dix sections. Vingt harnais au total, et
  `tests/manuel/TEST-v1.28.md` pour ce que les harnais ne voient
  pas — le geste, et ce qui s'allume sous le doigt.


## [1.27.0] — 2026-10-16

Le CSS est consolidé. C'est la condition d'un thème clair, et plus
largement de la v2.0.

### Changé

- **Toutes les couleurs vivent désormais dans un seul bloc `:root`**,
  et aucune ailleurs. Il y en avait **quatre-vingt-neuf** écrites à la
  main dans la feuille. Un thème clair aurait donné un écran à moitié
  noir.

- **Les teintes de fond font partie de la palette.** Elles étaient
  écrites une à une, à partir d'une palette antérieure jamais mise à
  jour : **deux bleus, deux verts, deux ambres et deux rouges**
  coexistaient, et les fonds ne s'accordaient plus avec le texte
  qu'ils portaient. La même étiquette `.tag.use` était même à `.13` à
  un endroit et `.14` à un autre.

  Quarante-sept déclarations changent donc très légèrement de
  couleur — hue ramené sur la palette actuelle, opacités
  harmonisées. Aucune règle n'a été ajoutée, déplacée ni supprimée :
  vérifié déclaration par déclaration.

- **Les onze en-têtes « À COLLER À LA FIN »** sont remplacés par ce
  qu'on trouve dans chaque section. C'étaient des instructions de
  livraison adressées à quelqu'un qui recopiait des blocs à la main ;
  elles ne décrivaient rien. Une table des matières ouvre le fichier,
  et dit où l'ordre compte.

### Corrigé

- **Deux variables CSS n'avaient jamais existé.** `var(--text)` et
  `var(--danger)` — les vraies s'appellent `--txt` et `--bad`. Huit
  déclarations étaient donc sans effet depuis des mois, en silence :
  le total de l'inventaire, le bouton de déconnexion des réglages et
  les puces de retard n'avaient pas la couleur prévue. Trouvées par le
  nouveau harnais, pas à l'œil.

### Ajouté

- **`tests/t127.js`** veille sur la feuille de style : aucune couleur
  hors de la palette, aucune variable employée sans être définie,
  aucune définie pour rien. Dix-neuf harnais au total.

- Le **README** était resté à la v1.2 : ni packs, ni projets, ni
  réparations, ni quatre états, et la moitié des fichiers du dossier
  `js/` manquaient à l'inventaire. Il est à jour, avec une feuille de
  route qui dit ce que la v2.0 recouvre.


## [1.26.0] — 2026-10-16

Aucun changement dans l'application. Cette version met à l'abri ce qui
la protège.

### Ajouté

- **Les dix-huit harnais de test entrent dans le dépôt**, sous
  `tests/`. Ils vivaient jusqu'ici dans un dossier de travail
  extérieur : chaque version était vérifiée, mais rien de cette
  vérification n'était conservé. Ils partaient à la fin de la séance.

  ```bash
  ./tests/run.sh          # les dix-huit
  ./tests/run.sh t124     # un seul
  ```

  Le premier lancement installe `jsdom`, leur seule dépendance — et
  elle appartient aux tests. **L'application elle-même n'en a aucune
  et ne doit pas en avoir** : c'est ce qui permet de la déposer sur
  GitHub Pages sans rien construire.

- **`tests/README.md`** : ce que chaque harnais protège, comment en
  écrire un, et les trois règles apprises à nos dépens — tester un
  comportement et non une phrase, tout charger dans un seul `eval`,
  extraire une fonction plutôt que charger une vue entière.

- **`tests/manuel/`** : les protocoles que les harnais ne peuvent pas
  couvrir. L'essai de restauration dans un bac à sable — le seul qui
  ait jamais trouvé cinq défauts d'un coup — et le tour de la v1.24.

### Changé

- **La checklist de livraison était incomplète.** Elle ne mentionnait
  pas `APP_VERSION`, ni les tests, ni l'ordre entre migration SQL et
  déploiement. Trois oublis qui se payent cher : un numéro
  désynchronisé sert un mélange d'ancien et de neuf, et du code neuf
  sur une base ancienne lit des colonnes qui n'existent pas.
  `UPDATE-PROCESS.md` a maintenant neuf étapes au lieu de six.

- Le README annonçait encore la version **1.2.0**.


## [1.25.3] — 2026-10-16

### Ajouté

- **L'appui long saisit un objet**, sur tablette, en plus de la
  poignée ⠿. On pose le doigt, la ligne se soulève — un léger relief
  et une ombre le disent — et on l'emmène. C'est le geste que la
  tablette a déjà appris à ses utilisateurs ; la poignée reste là pour
  qui préfère saisir sans attendre.

  La subtilité tient à l'ordre des choses : le navigateur décide de
  faire défiler dès le premier mouvement, et une fois qu'il a
  commencé, on ne peut plus le lui reprendre. L'appui long attend donc
  **sans bouger** — si le doigt se déplace avant la fin du délai,
  c'est un défilement et il a lieu normalement ; s'il tient, le
  défilement est bloqué à partir de là, alors que rien n'a encore
  commencé.

  Après un appui long, l'objet part au premier millimètre : il est
  déjà soulevé, et la personne l'a voulu. À la souris, le seuil de
  huit pixels demeure, pour qu'un clic tremblant ne déplace rien.


## [1.25.2] — 2026-10-16

### Corrigé

- **Il fallait choisir entre faire défiler et glisser.** Un glissement
  interdit à la page de bouger — c'est ce qui le rend possible. Mais
  la caisse où l'on veut déposer est souvent plus bas que l'écran : on
  se retrouvait à tenir un objet sans pouvoir aller là où il va, et à
  reposer pour faire défiler, puis à reprendre.

  La liste défile maintenant toute seule quand le doigt approche d'un
  bord, d'autant plus vite qu'il en est près, et jusqu'à une vitesse
  plafond. C'est le conteneur sous le doigt qui défile s'il le peut,
  la page sinon : le contenu d'une caisse défile donc dans sa fenêtre,
  et l'arbre des packs défile dans la page. Même mécanique dans la
  composition d'un projet.


## [1.25.1] — 2026-10-16

### Corrigé

- **Sur iPad, le doigt ne faisait plus défiler les listes.** La règle
  `touch-action:none`, qui empêche la page de glisser sous le doigt
  pendant qu'on déplace un objet, était posée sur **toutes les
  lignes**, en permanence. Or l'onglet Packs et la page de préparation
  ne sont faits que de lignes : le doigt ne trouvait plus nulle part
  où s'appuyer. En haut et en bas de liste, où les quelques espaces
  libres disparaissent derrière l'en-tête et le bandeau, l'écran
  restait bloqué.

  La règle ne vit plus que sur une **poignée ⠿**, ajoutée à chaque
  ligne déplaçable. Au doigt, on glisse par la poignée et on défile
  partout ailleurs ; à la souris, la ligne entière reste saisissable,
  puisque la molette ne se gêne avec rien. La poignée a un second
  mérite : c'est désormais la seule chose à l'écran qui dise qu'une
  ligne se déplace.


## [1.25.0] — 2026-10-16

### Changé — une place pour chaque chose

L'application va accueillir d'autres fonctions. Si chacune ajoute son
bouton là où il y avait de la place, l'écran finit en boîte à outils
renversée. La règle posée ici, et qui vaudra pour les autres onglets :
**une page par objet, et derrière un engrenage, une page de réglages**
qui réunit ses métadonnées et ses gestes rares — le même geste que les
réglages de l'application, donc une seule chose à apprendre.

- **La carte d'un projet est elle-même le bouton.** Un « Open » posé à
  côté de deux autres boutons obligeait à viser, alors que la carte
  fait trois cents pixels de large et ne veut dire qu'une chose. Elle
  s'ouvre aussi au clavier.

- **« Edit gear » ne vit plus que dans le projet concerné**, plus sur
  sa vignette.

- **Les réglages d'un projet sont une page**, ouverte par ⚙ en haut, et
  non plus un volet déplié sous la checklist. Elle réunit trois
  blocs — les informations du projet, les actions, puis archiver et
  supprimer à part.

- **La destination, les dates et la description** y ont déménagé. Elles
  traînaient dans l'en-tête de la composition, entre deux boutons, sur
  un écran qui sert à tout autre chose. Le nom reste là-haut : c'est le
  titre de ce qu'on est en train de monter.


## [1.24.3] — 2026-10-15

### Changé

- **Plus de carré vide devant un consommable** dans la checklist. Il
  n'a pas de fiche, donc jamais de photo : lui réserver la place
  revenait à promettre une image qui n'arriverait pas, et à le faire
  ressembler à un item. Le décalage avec les lignes d'items dit
  justement qu'il n'en est pas un.


## [1.24.2] — 2026-10-15

### Corrigé

- **Une caisse portant deux configurations pesait sa boîte vide.** Le
  poids d'un pack passait par « qui répond de ce contenant ». Tant
  qu'une caisse n'appartenait qu'à un pack, c'était le même chemin ;
  depuis la v1.24 elle peut en porter deux, plus personne ne répond,
  et chaque configuration ne comptait plus que sa boîte. Le calcul lit
  désormais le contenu du pack qu'on lui demande, directement.

  Trouvé en écrivant le protocole de test de la v1.24, pas par les
  tests eux-mêmes : ils ne couvraient pas encore ce croisement.


## [1.24.1] — 2026-10-15

### Changé

- **Un volet « Project settings »** replie ce qu'on fait une fois sur
  dix sorties : note de livraison, dupliquer, archiver, remettre la
  checklist à zéro, supprimer. Ils étaient en permanence sous la
  liste, ce qui mettait **Delete à deux centimètres de Go on show** —
  au moment précis où l'on travaille vite, les mains prises. Sous la
  checklist il ne reste que les transitions : *Start packing*,
  *Go on show*, *Pause*, *Close show*.

- **Remettre la checklist à zéro demande confirmation**, en disant
  combien de lignes seront décochées. Une case cochée vaut un objet
  posé dans la caisse ; tout effacer d'un coup au mauvais moment ne se
  rattrape pas.

### Ajouté

- **Les photos reviennent dans l'onglet Projets** — composition et
  préparation. C'est là qu'elles servent le plus : on coche un nom,
  mais on cherche un objet des yeux sur une étagère. Les lignes
  écartées et les doublons en ont aussi ; un consommable garde un
  carré vide, pour que la colonne reste droite.


## [1.24.0] — 2026-10-15

**Migration SQL à passer : `sql/026-contenants-partages.sql`.** Elle ne
modifie aucune donnée.

### Changé

- **Choisir un contenant ne propose plus les 649 items.** Trois lettres
  et on tombait sur un micro. La fenêtre ne propose que les
  sous-catégories de contenants — sacs, flight cases, racks studio,
  racks 500, expansions, plateaux, mobilier — plus tout ce qui sert
  déjà de contenant, pour ne rien casser. Une case *Show all items*
  rouvre la liste entière pour les cas imprévus. La liste vit dans
  `js/config.js` : l'allonger ne demande aucune migration.

- **Un contenant peut porter plusieurs recettes.** La même Pelicase
  sert à la config du trio et à celle du quintet ; l'interdire
  obligeait à inventer deux caisses pour une seule boîte. Une seule
  limite demeure : **un seul assemblage monté** par contenant, puisque
  c'est lui qui répond de « qu'y a-t-il dedans » et qui porte
  l'imbrication et le poids. L'application refuse le second en nommant
  le premier.

### Corrigé

- **Un item réclamé par deux caisses d'un même projet disparaissait de
  la seconde, sans un mot.** La première le prenait, la seconde ne le
  montrait plus du tout — impossible de comprendre pourquoi elle était
  incomplète.

  La seconde caisse l'affiche maintenant sous **Already taken by
  another case**, en disant dans laquelle il voyage. Et si un
  exemplaire libre du même modèle existe, un bouton le met à sa place
  en un clic, avec annulation.

  La recette n'est pas touchée : la caisse continue de dire
  « MSD-002 », c'est **ce projet-ci** qui note « ici, prends plutôt le
  MSD-005 ». La tournée suivante repart du réel.

### Feuille de route

- **Des recettes qui demandent un modèle plutôt qu'un exemplaire.**
  Une caisse dirait « 4 × Shure SM57 » au lieu de nommer quatre
  identifiants ; deux recettes ne pourraient alors plus se disputer le
  même objet, et « en ai-je assez ? » deviendrait calculable. Ne
  concerne que les familles à plusieurs exemplaires — câbles, pieds,
  SM57, DI. À décider après la préparation par projet, qui dira si le
  besoin est réel.

- **Ranger les items dans les caisses depuis le projet**, de sorte
  qu'un item attribué quitte la liste des disponibles.


## [1.23.2] — 2026-10-15

### Corrigé

- **Les menus d'état affichaient toujours les trois anciens.** Les
  options étaient écrites à la main dans `index.html` : passer de
  trois à quatre états n'a donc rien changé à l'écran, alors que tout
  le reste du code suivait déjà. Deux menus étaient concernés —
  modifier un item, et le retour de matériel.

  Les deux sont désormais remplis depuis `CONDS`, comme le reste de
  l'application. Une liste recopiée finit toujours par diverger de
  l'originale ; un test vérifie maintenant qu'il n'en reste aucune
  dans le HTML.


## [1.23.1] — 2026-10-15

### Corrigé — le quatrième état manquait encore à trois endroits

- **La fenêtre de signalement** ne proposait que « ça marche à part
  cette panne » et « marqué, usé ». Or l'objet pour lequel on ouvre un
  dossier est précisément celui qui ne fonctionne plus : il fallait
  prétendre le contraire. Elle propose désormais
  *Working apart from this fault · Damaged, still works · **Not
  working***.

  « Hors service » reste volontairement absent : il signifie retiré du
  parc, et un objet qu'on envoie en réparation y reste. Cet état-là se
  décide à la clôture.

- **Au retour d'un atelier**, un objet revenu sans rien de réparé était
  rangé parmi les « abîmés mais fonctionnels » — ce qui laissait croire
  qu'on pouvait compter dessus. Il revient maintenant **en panne**.

- **À l'import d'un fichier**, « en panne », « ko », « ne marche pas »
  étaient rabattus sur « usé ». Ils sont reconnus.

- Le tri de la colonne État lit désormais la liste des états au lieu
  d'en garder une copie — elle ne pouvait que diverger.


## [1.23.0] — 2026-10-15

**Migration SQL à passer : `sql/025-etats-materiel.sql`.** Elle ne
modifie aucune donnée : elle ouvre une valeur de plus.

### Changé — quatre états au lieu de trois

| | |
|---|---|
| **Good** | état correct |
| **Damaged, usable** | abîmé, mais ça marche |
| **Faulty** | en panne, toujours au parc |
| **Out of service** | retiré du parc |

Il manquait la case du milieu. Entre « usé mais ça marche » et « sorti
du parc », il y a l'objet qui ne fonctionne plus et qu'on va réparer.
Faute de pouvoir le dire, on le marquait hors service — ce qui le
retirait du parc — ou abîmé, ce qui prétendait qu'il marche.

La frontière entre les deux derniers n'est pas un degré de gravité,
c'est une décision : **Faulty** se répare, **Out of service** a été
retiré du parc. Les items déjà marqués hors service le restent : c'est
la définition qu'ils portaient déjà depuis la migration 016.

### Corrigé — l'application ne décide plus à votre place

- **Sortir une caisse écartait en silence les items signalés.** En
  panne, hors service, dossier de réparation ouvert : ils
  disparaissaient de la sélection sans un mot. On emporte pourtant un
  ampli capricieux quand on en a besoin, et découvrir au déchargement
  qu'il est resté au studio est le pire moment pour l'apprendre.

  Une fenêtre les liste désormais, **cochés par défaut** : on part
  avec, sauf si l'on décoche. Deux raccourcis — *Take everything* et
  *Leave the flagged ones* — et un décompte de ce qui reste. Si rien
  n'est signalé, aucune fenêtre ne s'ouvre : on ne pose une question
  que lorsqu'il y en a une.

  Un seul cas reste sans choix : l'objet qui est **chez un
  réparateur** n'est pas au studio, aucune case à cocher ne le fera
  apparaître dans la caisse. Il est listé à part, avec son atelier.

- **Un projet écartait de même un objet signalé.** Même règle : seul
  ce qui est physiquement ailleurs est écarté. Le reste part, en
  portant sa mention dans la checklist de préparation — « ⚠ faulty »,
  « ⚠ repair reported ».


## [1.22.4] — 2026-10-15

### Changé

- **Toutes les vues de tableaux prennent la largeur de l'écran.**
  L'inventaire le faisait seul depuis la v1.13.1 ; Checked out, Packs,
  Projets, Repairs et Borrowers restaient bridés à 1 100 px. Leurs
  colonnes se repliaient sur deux lignes pendant qu'un tiers du
  moniteur restait noir.

  Le tableau de bord et les réglages gardent leur largeur : ce sont des
  textes, et une ligne de prose trop longue se lit mal.

- **Plus aucun retour à la ligne dans un tableau.** Un en-tête coupé en
  « DESTINATION / » puis « REASON », une date coupée entre le jour et
  l'heure, un bouton coupé en deux : chaque fois, c'est toute la ligne
  qui double de hauteur. Les cellules ne se replient plus ; la première
  colonne s'abrège si besoin — le nom complet reste dans la fiche — et,
  en dernier recours, le panneau défile horizontalement.

  Sur téléphone, la règle s'inverse : le tableau y devient des cartes
  empilées, où le texte doit justement pouvoir passer à la ligne.


## [1.22.3] — 2026-10-14

### Corrigé

- **Les lignes grandissaient en dépliant une caisse.** Deux causes, les
  mêmes à chaque fois : « Check-in all » passait à la ligne dès que la
  colonne se resserrait, et la date se coupait entre le jour et
  l'heure. Chaque ligne y gagnait une deuxième hauteur de texte, et la
  liste dépliée devenait deux fois plus longue qu'elle n'avait besoin
  de l'être.

  Les cellules ne se coupent plus, sauf la première — le nom d'un item
  doit pouvoir passer à la ligne — et les lignes enfants sont plus
  serrées que les lignes de caisse : déplié, cela se lit comme une
  liste, pas comme autant d'entrées pleine hauteur. Sur téléphone, où
  le tableau devient des cartes, le découpage reprend ses droits.


## [1.22.2] — 2026-10-14

### Changé — les packs deviennent l'entrée principale

- **Packs passe en deuxième position dans la navigation**, juste après
  le tableau de bord, devant l'inventaire. C'est devenu le geste
  quotidien : on range par caisse, on sort par caisse, on rentre par
  caisse. Les emprunteurs, consultés bien plus rarement, descendent en
  fin de barre.

- **Envoyer une caisse depuis le tableau de bord.** Chaque caisse
  racine y figure avec son nombre d'éléments, son poids et son état, et
  un bouton **Send out** — ou **Check in** si elle est dehors, avec sa
  destination. Le geste demandait jusqu'ici quatre écrans.

  Seules les caisses racines sont proposées : une caisse imbriquée part
  avec celle qui la contient, la proposer à part inviterait à défaire un
  rangement sans le vouloir.

### Corrigé

- **L'onglet Checked out ignorait l'imbrication.** La LEASH SQ5+ Kit et
  le SQ5+ s'affichaient côte à côte, comme deux caisses parties
  séparément, alors que la seconde est dans la première. Les sorties
  sont désormais arborescentes comme partout ailleurs : une caisse
  racine par sortie, ses caisses imbriquées dessous et décalées,
  chacune dépliable, et le compte comme le poids de la ligne du haut
  englobent toute la branche.

  Une caisse imbriquée garde sa ligne même avec un seul objet dedans —
  la masquer reviendrait à prétendre que l'objet est posé en vrac dans
  la caisse du dessus. À la racine, en revanche, un objet seul reste
  une ligne ordinaire.


## [1.22.1] — 2026-10-14

### Corrigé

- **Le glisser-déposer de la page Projets lâchait au bord de la
  colonne.** Il ne s'appuyait que sur la capture de pointeur de la
  ligne : dès que le doigt la quittait, les événements cessaient
  d'arriver, le fantôme se figeait et le dépôt n'avait jamais lieu —
  c'est-à-dire précisément le geste qu'on demande de faire. Les
  écouteurs sont désormais sur la fenêtre, comme dans l'onglet Packs
  depuis la v1.20, où la mécanique est éprouvée.

- **Une caisse sortie entière était annoncée comme incomplète.** La
  fiche de la LEASH SQ5+, partie à la Mustard Factory, affichait en
  rouge « Missing from the rack — 3 ». Rien ne manquait : les trois
  éléments étaient dans la caisse, à l'autre bout de Paris. Le calcul
  confondait « absent de son rangement » et « manquant ».

  Un pack est maintenant reconnu comme sorti quand son contenant est
  parti, ou quand tout son contenu est parti ensemble — un objet seul
  à l'atelier ne compte pas, il s'en va sans la caisse. Dans ce cas,
  l'arborescence et la fiche affichent **Out · destination** plutôt
  qu'une alerte, la ligne de chaque élément cesse de répéter la même
  information, et le bouton devient **Check in pack** : une caisse
  revient d'un geste, puisqu'elle est revenue d'un seul morceau.


## [1.22.0] — 2026-10-14

**Migration SQL à passer : `sql/024-packs-presets-projets.sql`.**

### Changé — un pack est une recette, pas un lieu

- **Un item peut de nouveau appartenir à plusieurs packs.** La v1.20.4
  l'avait interdit, et c'était une correction excessive : ce qui rendait
  la v1.20 illisible n'était pas la cardinalité, mais deux relations
  concurrentes — le plan et la position — dont on ne savait jamais
  laquelle on manipulait. Une seule subsiste, `pack_items` ; on lève
  simplement son unicité.

  Car un pack n'est pas l'endroit où vit un objet : c'est un préréglage
  réutilisable. Le même préampli figure dans la config du rack studio et
  dans celle de la Pelicase de tournée ; une seule est montée à la fois.
  « Où est cet item ? » se lit désormais sur son emplacement et son
  statut de sortie — jamais sur le pack.

- **Chaque pack est « monté en permanence » ou « configuration ».** Un
  trou dans le rack studio est un problème ; une configuration de
  tournée qui n'est pas assemblée ne manque de rien. Même chiffre, deux
  lectures : l'onglet Packs ne signale un manque que pour le premier
  cas, et le compteur de packs incomplets ne compte plus que ceux-là.

- **Glisser déplace toujours, depuis la caisse d'où part le geste.** Avec
  l'appartenance multiple, un glissement pourrait vouloir dire « aussi
  ajouter » ; on tranche pour un seul sens. Pour qu'un item figure dans
  une deuxième recette, on l'ajoute depuis l'intérieur du pack.

- **Le contrôle anti-boucle remonte tous les parents**, dans
  l'application comme dans la base. L'ancien parcours en suivait un
  seul : avec plusieurs recettes, il aurait laissé passer une boucle
  refermée par l'autre branche.

### Ajouté

- **Les consommables d'un pack.** Gaffer, colliers, piles, un multitool :
  des lignes de checklist, pas des items. Ni identifiant, ni fiche, ni
  historique, ni étiquette — et volontairement **sans poids**, parce que
  le total d'un projet est le chiffre qu'on lit face à un transporteur.
  Ils apparaissent à la préparation de toute caisse qui les porte,
  packs imbriqués compris.

- **La page Projets est refondue.** Plus de fenêtre : la composition
  occupe l'écran, l'inventaire à gauche, le projet à droite, et l'on
  remplit en glissant de l'un vers l'autre. À gauche, deux onglets Items
  et Packs ; les exemplaires d'un même modèle tiennent sur une ligne avec
  un compteur, plutôt que douze lignes à glisser une par une. Sur iPad en
  portrait, le projet devient un bandeau fixe en bas de l'écran : la
  cible du dépôt reste sous le doigt.

  Le glisser-déposer utilise les pointer events, comme l'onglet Packs :
  l'API HTML de glisser-déposer ne fonctionne pas au doigt.

- **Le poids et le nombre de colis, partout.** Sur la carte d'un projet,
  en tête de la composition, en tête de chaque caisse, et dans le mail de
  livraison. C'est ce qu'on vous demandera.

- **Dupliquer un projet.** Un nouveau chargement ressemble presque
  toujours à un précédent ; partir d'une copie est plus rapide que
  n'importe quel glissement. Les caisses et les items sont repris, la
  checklist repart à zéro.

- **La checklist de préparation suit les caisses.** Une section par
  contenant, son contenu dessous, les consommables à part, et une
  progression par caisse en plus de la progression générale.

### Corrigé par construction

- **Un item apporté par une caisse n'est plus compté deux fois.** S'il
  traînait aussi dans la liste des items isolés, la caisse l'emporte et
  il est retiré du hors-caisse, avec un message qui le dit.

- **Un item indisponible est écarté, pas caché.** Sorti ailleurs ou en
  réparation, il reste affiché avec sa raison, hors de la checklist et
  hors du poids. On peut sortir la caisse quand même.

- **Le contenu d'un projet est figé au départ.** Tant qu'il se prépare,
  il suit les packs — vider une Pelicase change ce qui partira, et c'est
  voulu. Une fois parti, non : vider cette même caisse le lendemain
  réécrirait ce qui est sorti la veille.

- **La destination d'un projet était perdue à la réouverture** de la page
  de composition : le menu s'affichait sans sélection. Même piège qu'en
  v1.11 pour les lieux archivés, qui restent désormais sélectionnés.


## [1.21.6] — 2026-10-14

### Corrigé

- **Réimporter une sauvegarde doublait l'historique.** Les items, les
  lieux, les projets, les packs et les réparations se réécrivent
  par-dessus eux-mêmes et sont rejouables depuis toujours ; l'historique,
  lui, s'ajoutait. Ses lignes n'ont pas de clé naturelle — elles sont
  numérotées par la base — donc rien ne reconnaissait une ligne déjà
  présente.

  L'import écarte maintenant ce qui existe déjà, sur la signature qui
  définit une ligne d'historique : quel item, quel type d'événement,
  quand. Et il annonce combien de lignes ont été ignorées, pour que le
  doublon évité soit visible plutôt que supposé.

  Trouvé en enchaînant deux imports pendant l'essai de restauration :
  1 000 lignes tronquées plus 1 496 complètes donnaient 2 496.


## [1.21.5] — 2026-10-14

### Corrigé — trouvé par le premier essai de restauration

- **La sauvegarde tronquait l'historique à 1 000 lignes.** L'affichage
  ne charge que les 1 000 dernières entrées, pour rester rapide ; mais
  l'export exportait ce qui était chargé. Sur 1 495 lignes, un tiers
  manquait déjà — silencieusement, depuis toujours.

  L'export relit désormais la base, paginé : PostgREST plafonne lui
  aussi chaque réponse à 1 000 lignes, donc retirer la limite ne
  suffisait pas. Il annonce à la fin combien d'items et de lignes
  d'historique sont partis, pour que le compte soit vérifiable sans
  ouvrir le fichier.

- **La fenêtre de signalement proposait « Unusable »**, qui marquait
  l'item hors service tout en lui ouvrant un dossier de réparation.
  Or « hors service » veut dire retiré du parc, donc hors du flux de
  réparation — c'est la définition inscrite dans la migration 016
  elle-même, qui refusait cette combinaison. Les deux sens se
  contredisaient depuis la v1.17.

  L'option disparaît : ouvrir un dossier dit déjà que l'item n'est pas
  utilisable. L'état « hors service » se décide à la clôture, où il
  signifie quelque chose — la réparation n'a rien donné.

- **Trois migrations ne pouvaient pas tourner sur une base vierge.**
  014, 015 et 016 supposaient trouver les données qu'elles venaient
  transformer. Elles reconnaissent maintenant quatre états — à migrer,
  base vierge, déjà migrée, à moitié passée — et seul le dernier est
  refusé. Sans ça, remonter la base à zéro s'arrêtait à la
  quatorzième migration, c'est-à-dire le seul jour où ça compte.

### Note

Quatre correctifs de sauvegarde en quatre versions avaient été
découverts par relecture. Celui-ci est le premier trouvé en essayant,
et c'est aussi le plus grave : les précédents oubliaient une table
entière, visible au premier regard sur un fichier d'export. Celui-ci
coupait une table en plein milieu.


## [1.21.4] — 2026-10-14

### Ajouté

- **Sortir un contenant propose son pack.** Cocher la console affiche
  un bandeau : « contenant de SQ5 — 3 autres items dedans », avec un
  bouton pour tout emporter. On le signale et on laisse décider :
  embarquer trois cartes en silence rendrait l'application moins
  fiable, pas plus serviable.
- **La fiche d'un item dit où il se range**, et ce qu'il contient s'il
  est lui-même un contenant — avec le compte et le poids du pack.

  Sans ces deux additions, les packs n'existaient que dans leur propre
  onglet : il fallait y aller pour savoir qu'un micro vit dans la
  Pelicase Micros.


## [1.21.3] — 2026-10-14

### Ajouté

- **Le conditionnement figure sur la fiche d'un item**, avec le nom du
  contenant tel qu'il a été saisi : « housse Gator », « flight case
  d'origine ». Un item coché sans précision affiche « yes, not
  described » — ce qui se lit comme une invitation à le compléter
  plutôt que comme une information. Sans conditionnement, « none ».


## [1.21.2] — 2026-10-14

### Ajouté

- **Ajouter des exemplaires depuis la fiche d'un item.** La quantité
  n'existait qu'à la création — or on découvre souvent après coup
  qu'on possède deux housses K12 et pas une, et il fallait alors
  ressaisir la fiche entière.

  La convention de nommage est respectée : si l'item d'origine n'a pas
  de numéro, il prend le `#1` et les copies suivent. Sans ça on
  obtiendrait « K12 Bag » et « K12 Bag #2 », ce qui n'est une famille
  pour personne.

  **Le numéro de série n'est jamais recopié** — deux objets n'en
  partagent pas. Le reste suit : photo, poids, prix, emplacement de
  rangement, conditionnement.


## [1.21.1] — 2026-10-14

### Corrigé

- **Les cases à cocher s'affichaient en gros carré détaché de leur
  texte.** Une règle générale impose `width:100%` à tous les champs
  d'un formulaire — elle s'appliquait aussi aux cases. Elles sont
  désormais à leur taille, alignées contre leur libellé.

### Modifié

- **Le poids estimé devient le poids.** Le drapeau distinguait une
  mesure d'une approximation, ce qui semblait prudent — mais personne
  ne s'en servait pour décider quoi que ce soit, et il encombrait
  chaque total d'une mention que personne ne lisait. Aucune donnée
  perdue : les 46 valeurs concernées restent, elles cessent seulement
  d'être annotées.
- **Le conditionnement peut être précisé.** Cocher la case fait
  apparaître un champ libre — « housse Gator », « flight case
  d'origine ». Savoir qu'un synthé a une housse n'aide pas à la
  retrouver ; savoir laquelle, si.

### Ajouté

- **Le pays d'un atelier de réparation** est saisissable. La colonne
  existait en base depuis la migration 016, mais le formulaire ne
  l'exposait pas — un oubli, pas une décision. Il s'affiche dans la
  liste uniquement s'il est renseigné : un atelier à l'étranger change
  le délai d'expédition, un atelier français n'a rien à signaler.

### Base de données

`sql/023-conditionnement-detail.sql` : colonne `case_note`, et
suppression de `weight_est`.


## [1.21.0] — 2026-10-14

### Ajouté

- **Les sorties d'un même pack se regroupent.** Une ligne dépliable
  « Rack Sidecar · 4 items · 26,19 kg », au lieu de quatre lignes
  répétant le même emprunteur et la même destination. Un bouton
  « Check-in all » rentre la caisse d'un geste.

  Le regroupement n'a lieu que si plusieurs items du même pack sont
  sortis ensemble chez la même personne : mieux vaut pas de groupe
  qu'un groupe d'un seul. Et un item revenant de réparation en est
  écarté — il repasse par le contrôle au retour, pas par un check-in
  ordinaire.

- **Conditionnement** : une case à cocher par item, pour savoir s'il a
  une housse, un étui ou une boîte prévue pour le transport. Colonne
  triable et filtrable dans l'inventaire ; la liste de ceux qui n'en
  ont pas est une liste d'achats, en vue des tournées à venir.

  Volontairement un booléen et rien de plus : le détail de ce qu'est
  ce conditionnement a déjà sa place dans les notes de l'item.

### Base de données

`sql/022-conditionnement.sql` : colonne `has_case` sur les items.
Purement additif.


## [1.20.5] — 2026-10-12

### Corrigé

- **Sortir un pack ne prenait ni son contenant, ni son contenu
  imbriqué.** Seuls les membres directs étaient sélectionnés : la
  Pelicase restait au studio pendant que son contenu partait, et sortir
  un rack laissait sur place les modules du lunchbox rangé dedans.
  L'inventaire décrivait un chargement qui n'avait jamais eu lieu.

  La sortie couvre maintenant tout ce qui part physiquement — le
  contenant, ses items, et le contenu des packs imbriqués, sur autant
  de niveaux qu'il y en a. Ce qui est déjà sorti ou bloqué en
  réparation en est exclu, et annoncé.


## [1.20.4] — 2026-10-12

### Modifié — simplification du modèle

- **Un item est dans un pack, ou il n'y est pas.** Comme une piste dans
  un dossier Pro Tools.

  La v1.20 portait deux relations : le *plan* — ce que le pack devrait
  contenir — et la *position* — où l'objet se trouve vraiment. Sur le
  papier, ça permettait de dire « il manque trois micros, ils sont dans
  le Rack B ». À l'usage, illisible : trois états par ligne, un item
  visible dans plusieurs packs à la fois, et deux réponses
  contradictoires à la même question.

  « Ce qui manque » se lit désormais sur le statut de l'item — sorti,
  en réparation. C'est le cas qui compte avant un départ, et il ne
  demande pas d'inventer une seconde vérité.

### Corrigé

- **Un pack supprimé puis recréé se rangeait tout seul dans un autre.**
  Le contenant gardait son appartenance au pack parent après la
  suppression, et le nouveau pack héritait donc de la place de
  l'ancien. Pire, on ne pouvait plus l'en sortir : la zone « Take out »
  s'affichait d'après l'appartenance, l'action lisait la position, ne
  trouvait rien et refusait. Les deux symptômes avaient la même cause,
  et elle disparaît avec la seconde relation.

### Base de données

`sql/021-packs-simplifies.sql` : les positions sans appartenance
correspondante sont converties avant toute suppression, les
appartenances multiples réduites à une seule, un index unique inscrit
la règle dans la base, et `items.in_pack_id` disparaît.

### Ce qu'on perd, et pourquoi c'est acceptable

Savoir qu'une Pelicase « devrait » contenir huit micros quand trois
sont rangés ailleurs dans le studio. C'était l'argument de départ pour
les deux relations — mais c'est aussi exactement ce qui rendait l'écran
incompréhensible. Un modèle juste qu'on ne sait pas lire ne vaut pas un
modèle approximatif qu'on utilise.


## [1.20.3] — 2026-10-12

### Modifié

- **La zone « Take out » s'insère en tête de la liste**, au lieu de
  flotter en haut de la fenêtre. Une bande au sommet de l'écran n'a
  aucun rapport avec l'endroit où le geste se passe — sur une longue
  liste, il fallait quitter des yeux ce qu'on déplaçait pour la
  trouver. Elle apparaît désormais dans la liste d'où part le
  glissement : l'arbre des packs, ou le contenu d'un pack ouvert.


## Base de données — 2026-10-12

`sql/020-codes-identifiants.sql` — treize identifiants remis en accord
avec leur sous-catégorie. Aucun changement de code applicatif : la
migration embarque les 73 codes de `config.js`, compare chaque
identifiant au code attendu et corrige ce qui diverge, sans liste à
fournir.

Les numéros repartent du plus haut déjà pris pour chaque code,
corbeille comprise — réutiliser un numéro libéré ferait réapparaître un
identifiant mort dans un vieil historique. Les packs et les réparations
ont suivi par clé étrangère ; l'historique et les projets, qui stockent
les identifiants en texte et en JSON, ont été repris à la main.

Simulée sans collision avant exécution, puis vérifiée : plus aucun code
périmé dans Settings → Data.


## [1.20.2] — 2026-10-12

### Corrigé

- **Déposer un pack dans un autre ouvrait sa fiche dans la foulée.**
  Un glissement se termine par un clic que le navigateur envoie de
  toute façon : on venait de déplacer quelque chose, et une fenêtre
  s'ouvrait par-dessus le résultat qu'on voulait voir. Le clic qui suit
  immédiatement un glissement est désormais ignoré, partout.

### Ajouté

- **Sortir un objet de son pack en le glissant.** Une zone « ↥ Take out
  of … » apparaît en haut de l'écran pendant le geste, et seulement si
  l'objet est effectivement rangé quelque part — une cible permanente
  inviterait aux dépôts accidentels. L'objet quitte le plan du pack qui
  le contenait et n'est plus rangé nulle part ; ses autres
  appartenances ne bougent pas. Annulable dix secondes, comme les
  autres déplacements.
- **Les identifiants qui ne correspondent plus à leur sous-catégorie
  sont signalés** : un repère sur la fiche de l'item, et un compte dans
  Settings → Data qui ouvre la liste.

  Changer la sous-catégorie ne renumérote pas l'identifiant, et c'est
  délibéré : un identifiant qui change tout seul rendrait fausse une
  étiquette déjà collée, sans prévenir. Mais sans signalement l'écart
  s'accumule en silence — quatre cas s'étaient déjà installés, dont le
  WES Audio Titan en `CMP-007` alors qu'il est rangé en 500 series rack
  depuis un moment. L'application montre, elle ne corrige pas :
  renuméroter reste une migration, décidée en connaissance de cause.

### Note sur les tests

Deux contrôles du harnais ont dû être réécrits, pour la même raison :
ils vérifiaient du vocabulaire au lieu d'un comportement. L'un cherchait
le mot « renumbering » dans un fichier où il figure… dans le texte
explicatif de la fenêtre. Un test qui échoue sur sa propre documentation
ne teste rien.

## [1.20.1] — 2026-10-12

### Corrigé

- **« Container not found » sur un contenant pourtant choisi dans la
  liste.** Le formulaire relisait le texte sélectionné avec une
  expression régulière qui attendait des lettres avant le tiret de
  l'identifiant — un code de sous-catégorie commençant par un chiffre,
  comme `500-001` pour le rack 500 series, n'y entrait pas.

  La correction tient moins au motif qu'à la méthode : l'application
  devinait le sens d'une chaîne qu'elle venait elle-même de fabriquer.
  Elle garde désormais la correspondance entre ce que la liste propose
  et l'item visé. La lecture approximative ne sert plus que pour une
  saisie tapée à la main, et accepte alors les codes numériques, les
  identifiants seuls et le nom complet.


## [1.20.0] — 2026-10-12

### Ajouté

- **Les packs** : un onglet à part entière, pensé comme une session Pro
  Tools — des items dans des dossiers, des dossiers dans des dossiers,
  qu'on plie et qu'on déplie.
- **Glisser-déposer** un item ou un pack dans un autre pack, à la souris
  comme au doigt. La cible s'éclaire et **annonce le résultat avant la
  dépose** — le nombre d'items et le poids qu'on obtiendra. Une boucle
  interdite s'affiche en rouge plutôt que de laisser déposer puis
  d'échouer.
- **Annulation immédiate** après un déplacement : « 12 items → Pelicase
  Clavier · Annuler », dix secondes.
- Création, modification et suppression d'un pack ; ajout d'items en
  lot ; sortie d'un pack d'un geste.

### Le modèle, en deux relations

Un pack porte **un plan** — ce qu'il devrait contenir — et chaque item
porte **une position** — où il est vraiment. Garder les deux est ce qui
permet de dire, au chargement : « il manque trois micros, ils sont dans
le Rack B ». Avec le seul plan on ne sait jamais où est l'objet ; avec
la seule position on ne sait pas qu'il manque quelque chose.

Un item peut donc figurer au plan de plusieurs packs, mais n'être
physiquement que dans un seul. Et la fiche distingue **« dans Pelicase
Clavier »**, en gris, d'un **« manquant »** en orange : un item rangé
dans un autre pack auquel il appartient aussi est à une de ses places.
Sans cette nuance, un item partagé entre cinq packs en rendrait quatre
orange en permanence — et une alerte permanente n'est plus lue.

**L'imbrication ne demande aucune structure.** Un pack est représenté
par son contenant, qui est un item ordinaire, donc membre possible d'un
autre pack. Un lunchbox dans un rack, une console et ses cartes : même
mécanisme, zéro table supplémentaire. Le poids remonte en cascade, et
le total d'un écran ne somme que les racines pour ne pas compter deux
fois le même matériel.

### Note technique

**Pas d'API de glisser-déposer HTML** : elle ne fonctionne pas au doigt,
et l'iPad est la cible principale en studio. Des *pointer events* à la
place, donc un seul comportement pour la souris et le tactile.

**Pas d'undo global.** Une pile d'historique dans une application
partagée en temps réel permet d'écraser le travail d'un collègue trois
gestes plus tard. L'annulation ne porte que sur le geste qu'on vient de
faire : tout de suite ou jamais.

### Base de données

`sql/019-packs.sql` : tables `packs` et `pack_items`, colonne
`in_pack_id` sur les items, et deux déclencheurs qui refusent le rack
rangé dans le lunchbox rangé dans le rack. Le refus arrive à l'écriture,
là où l'on sait encore nommer le coupable — pas au calcul du poids, où
l'on ne verrait qu'un écran figé.

> La détection de boucle a d'abord été écrite à l'envers, des deux côtés
> à la fois : elle remontait depuis l'item au lieu de partir de la cible,
> et ne voyait donc que le cas trivial. Trouvée par les tests.


## [1.19.3] — 2026-10-12

### Ajouté

- **L'application prévient quand une nouvelle version est en ligne.**
  Un bandeau discret en bas d'écran annonce la version disponible et
  propose de recharger.

  Le `?v=` sur les scripts protège les scripts, mais rien ne protège
  `index.html` lui-même. Un navigateur qui le garde en cache réclame
  les anciennes adresses — qu'il a également en cache — et reste sur
  une version périmée sans qu'une seule requête n'atteigne le serveur.
  Seul un rechargement forcé en sort, et personne n'y pense. Le défaut
  est passé inaperçu tant qu'une seule personne utilisait l'app ; à
  plusieurs, chacun serait resté sur sa version.

  La vérification relit `index.html` sans cache et y lit le numéro que
  le serveur annonce. Pas de fichier de version à maintenir à côté :
  `index.html` porte déjà le numéro dans ses balises, et une source
  unique ne peut pas se désynchroniser. Contrôle au démarrage, toutes
  les vingt minutes, et au retour sur l'onglet. Hors ligne, il se tait.

  Le bouton « Reload » passe par une adresse jamais vue plutôt que par
  un rechargement ordinaire, qui pourrait resservir le même
  `index.html` caché — et le paramètre est effacé de la barre
  d'adresse aussitôt après.


## [1.19.2] — 2026-10-12

### Modifié

- **Les poids s'affichent toujours en kilos**, avec deux décimales et la
  virgule française : 850 g devient `0,85 kg`. Une colonne qui alterne
  « 284 g » et « 16.7 kg » oblige à convertir de tête à chaque ligne
  pour comparer deux valeurs — à l'usage, c'est l'unité unique qui rend
  la colonne lisible.
- **Le champ de saisie annonce son unité** : « Weight (kg) » au lieu de
  « Weight ». Il acceptait déjà `480 g` aussi bien que `0,48`, mais rien
  ne disait laquelle des deux était attendue — et devant un champ muet,
  on écrit le chiffre qu'on a en tête. La saisie reste indulgente :
  `0,48`, `0.48` et `480 g` sont tous lus, et réaffichés en kilos.

### Note sur une piste écartée

Une saisie contrainte façon terminal de paiement — les chiffres se
remplissant depuis les décimales — a été envisagée puis abandonnée.
Elle imposait un pas de 10 g, ce qui rendait insaisissables les
adaptateurs de 10 g et aurait arrondi un SM57 de 284 à 280 g : la
précision que l'import venait d'apporter, perdue à la première
correction manuelle. Elle n'aurait rien empêché non plus — la faute de
frappe du CM7 venait du tableur, pas du champ.

## [1.19.1] — 2026-10-08

### Corrigé

- **Un micro de 544 kg est passé sans un mot.** La cellule du tableau
  source disait `5;44 kg` — un point-virgule tapé à la place de la
  virgule. Le nettoyage retirait le caractère et 5,44 devenait 544. Un
  point-virgule ou deux-points entre deux chiffres sont désormais lus
  comme une virgule décimale.

### Ajouté

- **L'import signale les poids qui ne ressemblent pas à ce qu'ils
  décrivent.** Chaque valeur est comparée à la médiane de sa
  sous-catégorie : un facteur vingt dans un sens ou dans l'autre, et la
  ligne s'affiche avant écriture. Pas pour la refuser — un piano à
  210 kg est aberrant dans l'absolu et normal entre pianos — mais pour
  qu'elle soit vue.

  C'est ce qui manquait : rien ne confrontait le chiffre à son objet,
  donc une faute de frappe traversait toute la chaîne en silence. Le
  balayage complet du tableau n'a trouvé qu'une seule valeur de ce
  genre, mais une seule suffit à fausser un total de caisse.


## [1.19.0] — 2026-10-08

### Ajouté

- **Poids des items.** Colonne triable et filtrable par tranches, champ
  dans la fiche, et surtout **le total d'une sélection**, affiché dès
  qu'on coche des items. C'est l'information qu'on cherche en préparant
  un coffre de voiture, bien avant les caisses et les packs.
- **Un poids peut être déclaré estimé**, et le total le dit :
  « 2 930 kg · 18 sans poids · 11 kg estimés ». Un total muet sur ses
  trous laisse croire à une précision qu'il n'a pas — et c'est le genre
  de chiffre qu'on lit face à une limite de transporteur.
- **Import des poids depuis un tableur** (Settings → Data). L'appariement
  se fait sur **marque + modèle**, jamais sur l'identifiant : les
  identifiants ont changé deux fois, les noms non. Le rapport s'affiche
  avant toute écriture, avec les lignes du fichier qui ne correspondent
  à rien et les items qui resteront sans poids. L'import est rejouable :
  on complète le tableau, on recharge, seules les nouveautés sont
  écrites.

### Note technique

Le poids est stocké en **grammes entiers**. En kilos flottants, une
somme de six cents items produit tôt ou tard un total du genre
2930,0000000004 ; l'entier ne ment pas et l'affichage convertit.

Le lecteur de poids accepte ce que les gens écrivent vraiment —
`10Kg`, `5.4 kg`, `0,612`, `env 100Kg`. Ce n'est pas du confort : en
lisant le tableau source avec un convertisseur strict, j'avais conclu
qu'un tiers du parc n'était pas pesé alors que les trois quarts de ce
« trou » étaient des cellules parfaitement remplies. Un lecteur sévère
ne protège de rien, il perd des données en silence.

### Corrigé

- **Un nom contenant un pouce cassait la lecture d'un CSV.**
  `Ambassador Coated 14"` ouvrait une citation jamais refermée, qui
  avalait la fin de la ligne. Un guillemet n'ouvre désormais un champ
  cité que s'il en est le premier caractère. Trouvé par les tests, et
  pas par relecture.
- Les harnais vérifiaient un numéro de version écrit en dur, ce qui les
  cassait à chaque livraison. Ils comparent maintenant les étiquettes
  des scripts à `APP_VERSION` — un test qu'on rafistole à chaque fois
  finit par être ajusté sans être lu.

### Base de données

`sql/018-poids.sql` : colonnes `weight_g` et `weight_est` sur `items`.
Purement additif, aucune donnée existante touchée.


## [1.18.1] — 2026-10-08

### Corrigé

- **Les photos HEIC ne marchaient pas** — et pas seulement dans les
  réparations : la fiche d'un item et l'import en lot avaient le même
  défaut depuis le début. HEIC est le format par défaut de l'iPhone, et
  aucun navigateur sauf Safari ne sait le décoder. Le fichier était
  accepté, envoyé, et ne s'affichait nulle part.

  La parade tient en deux temps. Les champs n'annoncent plus que des
  formats universels (JPEG, PNG, WebP), ce qui **pousse iOS à convertir
  tout seul** au moment où l'on choisit la photo — c'est le cas courant,
  et il est réglé sans rien demander. Si un HEIC passe quand même, par
  glisser-déposer ou depuis un ordinateur, le message le nomme et
  rappelle le réglage à changer sur l'iPhone, au lieu du « unreadable
  image » d'avant.

### Modifié

- **Les photos sont redimensionnées à 1600 px avant l'envoi.** Une photo
  d'iPhone pèse 3 à 5 Mo ; six d'un coup sur une connexion de tournée,
  c'était une minute d'attente. Dix fois plus léger désormais, et bien
  au-delà de ce qu'un écran affiche. Cela répond à la réserve émise en
  v1.18.0 sur la lenteur de validation.
- Les trois chemins de photo de l'application — réparations, fiche
  d'item, import en lot — passent par le même décodeur. Ils divergeaient,
  et c'est pour ça que le même défaut existait en trois exemplaires.


## [1.18.0] — 2026-10-08

### Ajouté

- **Plusieurs photos par dossier de réparation**, jusqu'à six au
  signalement et six au retour. Une panne se documente rarement en une
  image : le connecteur arraché, la trace sur le flanc et l'écran éteint
  sont trois choses à montrer. Chaque vignette porte sa croix — retirer
  la troisième n'oblige pas à tout reprendre.
- **Visualiseur plein écran** : une vignette de 78 px ne montre pas une
  rayure. Un clic agrandit, les flèches passent d'une photo à l'autre.
  Vaut pour les photos en cours de saisie comme pour celles déjà au
  dossier.

### Corrigé

- **La sauvegarde JSON ignorait les réparations et les prestataires.**
  Une restauration aurait rendu l'inventaire entier mais sans aucun
  historique de panne, et sans les photos documentant l'état au départ —
  exactement l'omission corrigée en v1.12.2, sur une autre table. Les
  sauvegardes antérieures restent lisibles : une photo unique devient une
  liste d'une photo.

### Base de données

`sql/017-photos-multiples.sql` : `photo_open` et `photo_return` laissent
la place à `photos_open` et `photos_return`, deux listes. Les photos déjà
enregistrées sont reprises, vérifiées, puis les anciennes colonnes
supprimées dans la même transaction — garder les deux aurait garanti
qu'elles finissent par diverger. La migration peut être relancée sans
dupliquer les images.


## [1.17.1] — 2026-10-08

### Corrigé

- **Les zones de texte des fenêtres faisaient la hauteur d'un écran.**
  Faute de hauteur explicite, l'attribut `rows="2"` ne suffisait pas : le
  champ s'étirait et repoussait les boutons hors de vue. Deux lignes
  désormais, agrandissables à la main.

### Modifié

- **Plus d'encadré dans un encadré.** Une fenêtre est déjà une boîte ; en
  remettre à l'intérieur hiérarchisait à faux et brouillait la lecture.
  Les sections sont séparées par un simple filet, et la comparaison
  « état documenté / état constaté » par un filet vertical plutôt que par
  deux cadres qui isolaient les deux moitiés au lieu de les confronter.
- **Les flèches des menus déroulants étaient invisibles** — 10 px de large
  dans un gris à peine distinct du fond. Elles passent à 16 px, mieux
  contrastées, et s'éclaircissent au survol ; la cible fait 40 px de haut.
  Les chevrons de repli suivent. Ça vaut pour toute l'application, pas
  seulement les réparations.
- **L'ajout de photo devient une vraie commande** : un bouton pleine
  largeur plutôt qu'un petit carré, l'appareil photo ouvert directement
  sur tablette et téléphone (`capture`), un aperçu de 78 px et un bouton
  pour retirer ou remplacer. Une photo peut aussi être prise **au
  retour** : les deux se répondent.
- Les pastilles de choix passent à 42 px de haut, au-dessus du seuil de
  confort tactile.

### Corrigé aussi

- L'aperçu de la photo restait affiché d'un signalement à l'autre : la
  fenêtre repart maintenant à zéro à chaque ouverture.


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
