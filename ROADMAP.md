# Feuille de route — v2.7 à v3.0

Trois chantiers décidés le 9 novembre 2026, après une date préparée
pour de vrai et à moitié abandonnée. Ils sont ordonnés par la douleur
qu'ils soulagent, pas par leur élégance.

> Ce document enregistre **les décisions et leurs raisons**. Si l'un
> de ces choix paraît étrange dans six mois, le « pourquoi » est ici.

---

## Le diagnostic

Dernière date : départ sans checklist complète, approximation sur les
câbles spare.

Ce n'est pas une négligence, et ce n'est pas une fonction manquante.
C'est une **conséquence du modèle** : la famille *Cables & connectors*
compte treize sous-catégories, donc chaque câble est aujourd'hui un
**item** — identifiant, fiche, historique. Personne ne tient à jour
quarante XLR numérotés un par un. La donnée dérive, la checklist
devient incroyable, on pack à l'œil.

Un XLR est au même rang qu'un Minimoog. C'est ça, le problème.

Snipe-IT trace exactement cette ligne entre *Asset* et *Accessory* :
en dessous d'un certain seuil, le suivi individuel coûte plus qu'il
n'apporte, et l'on passe au **comptage**. Et c'est le comptage qui
rend une checklist définitive — « XLR 3 m × 6 » n'est un fait que si
l'application sait qu'on en possède 14 et qu'il en reste 8 au studio.
Sans ça, c'est un vœu.

Conséquence sur l'ordre des chantiers : auditer 650 items
individuels, personne ne le fera jamais ; auditer 120 vrais items et
**compter vingt bacs**, c'est un samedi matin. Le niveau accessoire
ne règle pas que les spares — il rend l'audit faisable. Il passe donc
devant.

---

## v2.7 — Trois niveaux de matériel

### Ce qui existe, et ce qui manque

| Niveau | Exemple | Suivi individuel | Stock compté | Revient |
|---|---|---|---|---|
| **Item** | Minimoog, U87, Pelicase | oui — ID, fiche, historique | — | oui |
| **Accessoire** *(nouveau)* | XLR 3 m, DI, pied de micro | non | **oui** | oui |
| **Consommable** *(promu)* | gaffer, piles, colliers | non | oui | **non** |

Les consommables existent déjà depuis la v1.22, mais comme de simples
**libellés accrochés à une caisse**, sans stock ni existence propre.
Ils deviennent des lignes de plein droit, avec une quantité possédée.

### Décisions prises

**Tout le câblage courant bascule en compté** — XLR, TRS, TS, RCA,
secteur, adaptateurs. Les multipaires et patchbays sont à trancher au
cas par cas au moment de la bascule.

**Un seul rattachement : la dotation d'une caisse.** La malle câbles
contient *toujours* 12 XLR 3 m. Écrit une fois, part avec elle.

> **Un appoint par projet a été envisagé puis écarté, le même jour.**
> L'idée était d'ajouter « +4 XLR 10 m, pour cette date seulement ».
> Elle ne résout aucun problème réel : les spares de la dernière date
> n'étaient pas *mal comptés*, ils n'étaient **pas sur la liste du
> tout**. Une dotation fixe les y met. Et si une caisse demande
> d'être ajustée trois dates de suite, ce n'est pas qu'il manque un
> appoint — c'est que sa dotation est fausse.
>
> C'est la leçon de la v1.29, où les rangements propres à un projet
> avaient été construits puis supprimés pour la même raison : un
> second endroit où déclarer ce qui part coûte plus en confusion
> qu'il ne rapporte en souplesse.

### Un « spare » n'est pas un concept

C'est une ligne de dotation comme une autre, avec une case à cocher
qui ne change que le sous-titre sous lequel elle s'affiche — comme
*Power supplies* et *Consumables* se rangent déjà aujourd'hui.

Son utilité est de lecture, pas de modèle : au chargement, on sait
quelles lignes on peut sacrifier si la place manque.

```
MALLE CÂBLES                                    28,4 kg

Accessories                        owned   here   left   out of service
  XLR 3 m                      ×12    40     16     23        1
  XLR 10 m                      ×6    12      6      6        —
  Spares
  XLR 3 m                       ×4
  Jack TS 3 m                   ×2    48      2     46        —
```

Les colonnes de droite sont tout l'intérêt du chantier : « ×12 »
n'est un fait que parce que l'application sait qu'on en possède 40,
qu'un est hors service, et qu'il en reste 23 d'utilisables au
studio.

**Deux entrées de plus dans le rail** : Accessories et Consumables,
au même rang qu'Inventory. Le rail passe de 8 à 10 — accepté, parce
que ces pages se consultent pendant qu'on prépare, et qu'un onglet
imbriqué les aurait rendues secondaires alors qu'elles ne le sont
pas.

### La répartition, arrêtée sur le parc réel

Décidée le 10 novembre 2026 en lisant les 674 items en ligne, et non
d'après les noms de sous-catégories.

**La bascule se fait par MODÈLE, pas par sous-catégorie.**

C'est la règle qui a émergé de deux objections successives, et elle
est plus juste que n'importe quelle liste :

- *les pieds de micro* — vingt exemplaires, mais neuf modèles, soit
  2,2 chacun. Un K&M 210/9 à perche et un 25960 à socle fonte ne se
  remplacent pas : on choisit celui qui tient la position. Ce n'est
  pas un bac d'objets interchangeables, c'est un choix ;
- *le Grace Design m900* rangé en « ampli casque », le *Palmer
  PWT12* et le *Voodoo Lab Mondo* en « alims pédales » — des unités
  à plusieurs centaines d'euros, seules de leur espèce. Écrire
  « Grace Design m900 : 1 possédé » n'apprend rien et lui fait
  perdre sa fiche, son historique et sa valeur.

**Le critère est donc : y a-t-il quelque chose à compter ?** En
dessous de trois exemplaires du même modèle, non.

| Familles retenues | Modèles | Items |
|---|---|---|
| Câblage : XLR, TS, TRS, Mini TS/TRS, RCA, XLR F/TRS, XLR M/TRS, adaptateurs | | 170 |
| Adaptateurs de pas de vis — 2,96 € | | 20 |
| Amplis casque — dix Behringer PM1 identiques | | 14 |
| Alimentations de pédales | | 11 |
| **Total examiné** | **63** | **215** |
| → **3 exemplaires ou plus : comptés** | **33** | **171** |
| → 1 ou 2 exemplaires : restent items | 30 | 44 |

Les exemplaires qui vivent dans des caisses deviennent autant de
**dotations** — 45 environ. C'est l'étape qu'on ne doit pas rater :
sans elle, les malles perdent leur câblage en silence.

**Deviennent des consommables — 17 items → 4 lignes**

*Instrument consumables*, c'est-à-dire les peaux de batterie. Elles
se consomment et ne reviennent pas : la troisième catégorie existait
déjà dans le parc, sans avoir de nom.

**Restent des items, quel que soit le comptage**

- **Bag** (15, dont 13 contenants de caisse), **Flight case** (7,
  dont 4), **Keyboard stand** (13, dont 2). Un contenant doit avoir
  une fiche.
- **Studio monitor** (22, dont 11 dans des lots) — les Amphions et
  leur Amp 700.
- Tout ce qui porte un **besoin déclaré** ou un dossier de
  réparation.
- **Audio multicore** et **Patchbay** : un exemplaire chacun.

**Examinés et gardés en items**, bien que le comptage les désignait :
casques (13, 149 €), pieds de micro (20), pieds d'enceinte et
extensions (15), multiprises (12), percussions (9). Le prix et le
caractère remplaçable ne suffisent pas — on attrape vingt câbles à
la poignée, pas vingt pieds de micro.

**Bilan : 171 items suivis individuellement en moins, et ce sont
exactement ceux que personne ne tenait à jour.**

### L'écran de bascule

Il liste les **63 modèles** avec leur compte, leur prix et les
caisses où ils figurent ; coche d'office ceux à trois exemplaires ou
plus ; et laisse arbitrer le reste. Soixante-trois décisions, une
seule fois.

Pas d'automatisme muet : c'est un geste irréversible dans l'esprit
même s'il se défait techniquement, et le genre de chose dont on veut
se souvenir d'avoir décidé.

### Quand un accessoire casse

Un accessoire n'a pas de dossier de réparation. La ligne porte donc
**deux chiffres** : possédés et hors service.

> XLR 3 m — 12 possédés, 1 HS, **11 utilisables**

Décrémenter purement ferait baisser la valeur d'achat du parc alors
que l'objet est encore là, et surtout ferait disparaître la trace de
ce qu'il y a à réparer ou à jeter. Deux chiffres au lieu d'un, pour
une information qui manquerait sinon.

### Une anomalie à corriger pendant la bascule

La sous-catégorie **Power cable** est vide : les câbles secteur sont
rangés dans *Facility & other › Power / electrical*. Sans
redressement, ils échapperaient au tri du câblage.

### Ce que la bascule fait, et pourquoi elle ne fait pas peur

Pour chaque modèle coché dans l'écran ci-dessus :

1. Une **ligne comptée** est créée : les dix « Cordial XLR 3 m #1…#10 »
   donnent une ligne de dix.
2. Les items sont **archivés, pas supprimés** : leur historique reste
   lisible, et une bascule ratée se défait.
3. **Les caisses qui les contenaient reçoivent la dotation
   correspondante.** Sans cette étape, les malles perdraient leur
   câblage en silence — exactement le genre de perte qu'on ne
   remarque qu'un soir de montage.
4. Les **besoins déclarés** sur un item basculé sont signalés plutôt
   que jetés : un accessoire ne porte pas de besoin, et perdre une
   déclaration sans le dire serait pire que refuser la bascule.

### Les champs d'un accessoire

Repris du modèle Snipe-IT, qui a vingt ans d'usage derrière lui :

nom, **quantité possédée**, catégorie et sous-catégorie, **emplacement**,
**seuil d'alerte**, poids unitaire, photo, fournisseur, prix d'achat,
notes.

Deux méritent un mot, parce qu'ils ne figuraient pas dans mon premier
plan :

- **L'emplacement.** « Il reste 24 XLR au studio » appelle aussitôt
  « où ? ». Un accessoire a un bac, une étagère, un tiroir — et sans
  ce champ le comptage renseigne sans aider.
- **Le seuil d'alerte.** « Prévenir sous 6 » : c'est ce qui transforme
  un inventaire en outil de réapprovisionnement, et ça ne coûte qu'une
  colonne et une ligne au tableau de bord.

### À trancher pendant le chantier

- **Les consommables se déduisent-ils automatiquement au départ ?**
  Snipe-IT le fait. Pour du gaffer, la tenue de compte coûte peut-être
  plus que l'information. Hypothèse de départ : stock ajustable à la
  main, avec un seuil d'alerte — et un bouton « j'en ai usé N »,
  plutôt qu'une déduction automatique à chaque date.
- **Les multipaires et patchbays** restent-ils des items ?
- **Le poids** : un accessoire porte un poids unitaire, multiplié par
  la quantité, et compte dans le total transport.
- **Que fait l'app quand la dotation dépasse le stock ?** « Cette
  caisse veut 12 XLR, il n'en reste que 8 libres » doit se voir à la
  préparation, pas sur le quai. Même mécanique que les items déjà
  pris par une autre caisse.

---

## ~~v2.8 — L'audit~~ — RETIRÉ le 12 novembre 2026

> **Écarté avant d'être construit.** Aucun des retours de six
> semaines ne portait sur un objet introuvable : ils portaient tous
> sur la friction de préparation. Le cycle sortie/retour est déjà une
> vérification — chaque caisse qui part fait toucher et cocher ses
> items. Et un audit que personne ne fait produirait 469 compteurs
> « en retard », soit exactement le mur d'alertes supprimé en v2.7.3.
>
> **Ce qu'il faut en garder** : récolter la vérification déjà faite.
> Cocher un item en préparation, c'est constater qu'il existe et où
> il est. Tamponner « vu le … » à ce moment-là donnerait des données
> d'audit gratuitement, et la liste de ce que personne n'a touché
> depuis un an serait la vraie information — pas 469 compteurs. À
> faire le jour où l'on touche à la préparation.
>
> Le texte d'origine est conservé ci-dessous.

### Le projet d'origine

Un inventaire dit où les choses **devraient** être. Rien ne confirme
jamais qu'elles y sont, et la dérive ne se voit qu'un soir de
montage.

- Chaque item porte une **date de dernier contrôle** et une **date de
  prochain contrôle**, l'intervalle étant réglable.
- Le geste est minuscule : on scanne l'étiquette QR — la fiche
  s'ouvre déjà —, on confirme « vu, ici », la date se tamponne. Si
  l'emplacement constaté diffère, il se corrige au passage.
- Pour un accessoire, c'est un **comptage** : « j'en compte 12 », et
  l'écart avec le stock théorique est enregistré plutôt que masqué.
- Le tableau de bord liste ce qui est en retard de contrôle, au même
  endroit que les retards de retour.

C'est le chantier qui attaque la **confiance**, qui est le vrai sujet
d'un inventaire. Il vient après les accessoires parce qu'il ne devient
réaliste qu'une fois les câbles comptés plutôt que numérotés.

---

## ✅ v2.10 — Les conflits de dates (livré le 13 novembre 2026)

Livré tel que décrit ci-dessous, sans migration. Trois cas limites
ont été tranchés en chemin, et le troisième n'avait pas été vu :

- un projet **sans dates** ne réserve rien — c'est un modèle, pas une
  date. L'application dit pourquoi elle se tait, plutôt que de laisser
  croire qu'il n'y a pas de conflit ;
- une **date passée** n'alerte plus ;
- **sauf si le projet est encore en show** : une date de retour
  dépassée n'en est plus une, le matériel est dehors et sa plage reste
  ouverte. Trouvé par le harnais, pas par moi.

Reste ouvert, si le besoin se présente : l'avertissement n'existe que
dans la composition. Le tableau de bord et la liste des projets ne le
portent pas encore.

### L'analyse d'origine

## Un trou trouvé en lisant le dépôt Snipe-IT

Pas dans leur code : dans la liste des outils tiers de leur README.
Quelqu'un a écrit **SnipeScheduler — « An Asset Reservation System »**,
c'est-à-dire exactement ce qui manque à leur cœur. Et ici aussi.

`projBusy()` ne regarde que le **présent** : un item est occupé s'il
est *déjà sorti*. Les dates d'un projet ne servent qu'à l'affichage.

Donc deux dates sur le même week-end peuvent toutes les deux prévoir
le U87, et personne ne le sait **avant que la première parte**. On
découvre le conflit le matin du chargement, quand il est trop tard
pour trouver autre chose.

Tout est déjà là pour le détecter : `starts_on`, `ends_on`,
`item_ids`, `pack_ids`. Il manque la comparaison, et un avertissement
dans la composition — « le U87 est aussi prévu pour *Trianon*, du 12
au 13 ».

C'est petit, ça ne demande aucune migration, et ça règle une panne
qui ne se voit qu'au pire moment. À caser juste après la v2.7.


## ✅ v2.8 — Le parc informatique (livré le 12 novembre 2026)

Réduit par rapport au plan ci-dessous, et volontairement : le journal
d'entretien et le tableau d'alertes dédié étaient de l'anticipation
— l'onglet *Maintenance* du tableur comptait 204 lignes préparées et
zéro remplie. Livré : l'alias, la garantie, les champs par domaine
déclarés dans `config.js`, et l'onglet IT en **lecture filtrée** de
l'inventaire.

### L'analyse d'origine

Un fichier Excel de suivi des sept ordinateurs du studio, fait à
côté : 38 colonnes, un journal d'interventions, un tableau de bord
d'alertes.

**La moitié existe déjà dans l'application.** Identifiant, statut,
emplacement, type, modèle, n° de série, date et prix d'achat,
fournisseur, notes — ce sont les champs d'un item. En prime, l'app a
ce que le tableur n'aura jamais : une photo, une étiquette QR, un
historique de sorties, une corbeille.

**Mais pas l'alias**, contrairement à ce que j'avais écrit dans une
première version de ce document. Voir le point 5 : c'est le seul
manque *générique* que ce tableur révèle, et il ne concerne pas que
les ordinateurs.

Le reste se range en cinq, et un seul point est structurant : le
journal d'entretien **ne doit pas rejoindre les réparations**.

### 1. Un journal d'entretien, SÉPARÉ des réparations

C'est la décision structurante de ce chantier, et elle va à l'encontre
de mon premier réflexe.

`repairs` est construit autour d'une **panne** : un symptôme constaté,
un état au départ, une photo de preuve, un envoi chez un prestataire,
un retour, une clôture — et pendant tout ce temps, l'item est bloqué
à la sortie.

« MAJ macOS 14.5 », « dépoussiérage », « vérification de la
sauvegarde » ne sont rien de tout ça. Les ranger dans `repairs`
obligerait à :

- inventer un `fault` qui n'existe pas ;
- afficher un incident ouvert sur une machine qui va parfaitement
  bien ;
- noyer les vraies pannes sous la routine, dans l'onglet même qui
  sert à ne pas en oublier une.

C'est l'erreur du XLR au même rang que le Minimoog : deux choses aux
cycles de vie différents ne partagent pas une table sous prétexte
qu'il leur arrive quelque chose à toutes les deux.

| | `repairs` | journal d'entretien |
|---|---|---|
| Point de départ | quelque chose ne va pas | rien ne va mal |
| Bloque la sortie | oui | non |
| Prestataire, suivi, retour | oui | non |
| Clôture | oui, avec un verdict | non, c'est un fait daté |
| Champs | panne, état, photos, destination | date, type, description, par qui, durée, coût |

**La table est générale, l'écran est spécifique.** L'entretien d'un
ampli à lampes ou d'un flight-case existe aussi ; on ne le proposera
pas tout de suite, mais le modèle ne devra pas être refait le jour où
l'on en voudra. Une seule table `maintenances`, affichée d'abord dans
la vue informatique.

`repairs` porte déjà, vides, les colonnes `cost` et `under_warranty`,
avec ce commentaire écrit en v1.17 : *« la colonne existe pour que
l'ajouter plus tard n'oblige pas à reprendre l'historique »*. Elles
servent aux réparations, pas à l'entretien — les deux comptes restent
distincts.

### 2. Une vue dédiée, pas un onglet de l'inventaire

Sept machines parmi six cents items, avec quinze colonnes que rien
d'autre ne porte : les chercher dans l'inventaire général n'a pas de
sens. Une **entrée de rail**, comme Accessories et Consumables, avec :

- la liste des machines et leurs colonnes propres ;
- le tableau de bord d'alertes du tableur — stockage au-delà de 85 %,
  garantie expirée ou à moins de 90 jours, batterie sous 80 %,
  FileVault inactif, entretien en retard ;
- le journal d'entretien.

Les machines restent des **items** de l'inventaire : même base, même
sauvegarde, même étiquette QR, même historique de sorties — le mac
mini *Live* part en tournée comme le reste. C'est la vue qui est
séparée, pas la donnée.

### 3. La garantie — générique, et qui manque à tout le parc

*Fin de garantie / AppleCare* et *jours restants* valent pour un U87
comme pour un Mac Studio. Deux colonnes, une alerte au tableau de
bord, utile bien au-delà des ordinateurs.

### 4. Des champs propres aux ordinateurs — mais lesquels

Le tableur en propose une vingtaine. Les garder tous serait refaire
l'erreur des quarante XLR numérotés : **un champ que personne ne met
à jour est pire qu'un champ absent, parce qu'il a l'air d'une
réponse.**

La règle de tri n'est pas « variable ou pas ». C'est : **qu'est-ce
que cette information, au juste ?**

#### Un CHAMP, quand c'est une décision ou une caractéristique

Ça change rarement, et quand ça change c'est parce que quelqu'un l'a
voulu. On le lit pour décider quelque chose.

| Champ | Pourquoi |
|---|---|
| **Version de l'OS** | Dans un studio, ce n'est pas une métrique : c'est une **décision**. On ne met pas à jour parce qu'une mise à jour existe — on reste sur une version parce qu'un driver ou un plugin ne suit pas |
| **Mise à jour gelée + raison** | Le champ qui manque au tableur, et probablement le plus utile de tous : « bloqué en 14.5 — driver Antelope ». Sans lui, quelqu'un mettra la machine à jour un dimanche soir |
| **OS maximum supporté** | Quasi statique, et surtout : c'est une propriété du **modèle**, pas de la machine. Un mini Intel 2018 plafonne, ses deux exemplaires plafonnent pareil → relève de la v3.0 |
| Puce, RAM, stockage total | Les caractéristiques. Elles ne bougent jamais, sauf extension |
| Rôle / usage | Voir le point 6 : c'est ce qu'on lit en premier dans une liste de sept machines |
| Logiciels clés et leurs versions | Même logique que l'OS : une DAW en 2024.6 parce que la 2025 casse quelque chose. À tenir court — la DAW et deux ou trois briques critiques, pas un inventaire de plugins |
| Nom d'hôte, adresse MAC | Stables par nature |
| Adresse IP | Seulement si elle est fixe. En DHCP, c'est une mesure, pas un champ |
| FileVault, destination de sauvegarde | Des réglages, pas des mesures |

#### Une ENTRÉE DE JOURNAL, quand c'est un fait daté

Le tableur stocke « date de dernière MAJ macOS » et « dernière
sauvegarde » dans des colonnes. Ce sont des **événements** — ils ont
une date, un auteur, parfois une durée. Le journal d'entretien les
porte mieux, et en garde l'historique au lieu de n'en garder que le
dernier.

- *date de dernière MAJ macOS* → une intervention « MAJ macOS », qui
  dit au passage **de quelle version vers quelle version** ;
- *dernière sauvegarde* → une intervention « vérification
  sauvegarde », qui dit **qui** a vérifié.

Deux colonnes en moins, et une information plus riche.

#### Un RELEVÉ D'AUDIT, quand c'est une mesure

Stockage libre, pourcentage utilisé, cycles et santé de batterie.
Ça dérive en permanence, personne ne le saisira spontanément, et ça
n'a de sens que daté.

Ces valeurs se prennent au moment où l'on a la machine sous les yeux
— l'**audit** de la v2.8. Le geste y est déjà : on scanne, on
confirme l'emplacement ; pour un ordinateur on relève trois chiffres
de plus. L'audit en garde la suite, donc on voit une batterie
descendre d'un contrôle à l'autre — ce qu'une colonne écrasée à
chaque saisie ne montrerait jamais.

C'est la même idée que « pour un accessoire, l'audit est un
comptage » : l'audit est le moment où l'on constate.

#### Écarté

*Périphériques connectés* : ça change tous les jours, et c'est déjà
l'inventaire. Si un convertisseur est branché sur le Mac Studio A,
c'est son emplacement qui le dit.

### 5. L'alias — un manque générique, pas informatique

Un item est aujourd'hui `brand` + `name`, et `name` tient lieu de
**modèle** : la fiche affiche « Model : Mac Studio M2 Max 2023
96 Gb ». Le nom d'usage n'a nulle part où aller — au mieux dans les
notes, où il ne s'affichera jamais comme titre.

Et le problème est plus large. Deux machines identiques,
`groupKeyOf()` les regroupe en « #1 » et « #2 ». Personne ne dit « le
Mac Studio numéro 1 » : tout le monde dit « le A ». Même chose pour
deux Pelicases qu'on appelle « la bleue » et « la grise », ou pour
deux K10 qu'on distingue par un numéro de flight-case collé dessus.

Donc : **une colonne `alias`, sur tous les items, pas dans le jeu de
champs informatique.**

- affichée en titre quand elle existe, le modèle passant en
  sous-titre — « **AccessFlow A** · Mac Studio M2 Max 2023 96 Gb » ;
- cherchable comme le reste ;
- et prioritaire sur le « #N » automatique quand deux exemplaires en
  portent une, parce qu'un nom d'usage bat toujours un numéro de
  série d'inventaire.

L'« alias secondaire » du tableur (« Mac Studio A » à côté de
« AccessFlow A »), lui, ne mérite pas une seconde colonne : c'est une
variante du même nom, et la recherche la trouvera dans les notes.

### 6. Le rôle — une colonne du jeu de champs

*Rôle / Usage* — « mixage », « mesure », « live », « contrôle » —
n'est pas une note : c'est ce qu'on lit en premier dans une liste de
sept machines, et ce sur quoi on veut filtrer. Il rejoint le jeu de
champs informatique, avec une liste de valeurs plutôt que du texte
libre.

### La forme technique

**Une colonne `extra` en jsonb sur les items, et les jeux de champs
déclarés dans `config.js`, par sous-catégorie.**

C'est précisément ce que j'avais écarté deux jours plus tôt en
qualifiant les champs personnalisés de Snipe-IT de « beaucoup de
machinerie pour trois champs qu'on ajoute en dur en dix minutes ».
Il y en a une dizaine, pour une seule sous-catégorie, et le jour où
l'on voudra suivre les lampes d'un ampli ce sera la même demande. La
prémisse était fausse, pas le raisonnement.

Pas d'écran d'administration pour les définir : `CATS`, `CONDS`,
`NEED_PRESETS` et `CONTAINER_SUBS` se tiennent déjà ainsi, le README
dit où les modifier, et un studio de trois personnes ne gagne rien à
une interface pour une liste qu'on édite trois fois par an. Une
migration, jamais deux.

### Et le tableur ?

L'argument pour l'absorber n'est pas l'élégance : **deux sources de
vérité sur le même studio finissent toujours par diverger.** Celle
qui n'est pas sous les yeux tous les jours est celle qui se périme,
et ce sera le tableur.


## À noter — les licences logicielles

Idée du 12 novembre 2026, pas encore planifiée.

Un onglet pour suivre les licences : nom, éditeur, type (iLok, liée
à la machine, liée au compte), nombre de postes, où elle est
activée, échéance de renouvellement, coût.

**Ce qui en fait plus qu'une liste** : une licence est activée *sur
quelque chose* — une machine du parc, ou une clé iLok qui est
elle-même un item. C'est le même mécanisme que les lots de la v2.5 :
une relation entre deux objets déjà suivis. « Qu'est-ce qui tombe si
je reformate le Mac Studio A ? » devient une question à laquelle
l'application répond.

### Sur la liaison avec iLok License Manager

**Vérifié le 12 novembre 2026 : rien de public ne permet de le
faire.** iLok License Manager est une application de bureau, la
gestion passe par son interface et par le compte iLok en ligne. PACE
publie des outils pour les éditeurs qui protègent leurs logiciels,
pas une API de lecture pour les détenteurs de licences.

Ce qui reste possible, et honnête : une **saisie manuelle**, avec un
champ « support » qui pointe vers l'iLok ou la machine concernée.
Une trentaine de lignes à saisir une fois, puis une au fil des
achats. Moins séduisant qu'une synchronisation, mais ça existe —
contrairement à la synchronisation.

À reconsidérer si PACE ouvre quelque chose, ou si l'export de
l'application de bureau s'avère exploitable.


## v3.0 — Les modèles

Aujourd'hui le modèle est **déduit du nom** par `groupKeyOf()` :
« SM57 #1 » et « SM57 #2 » sont regroupés parce qu'ils se ressemblent.
Deux conséquences qu'on a contournées plutôt que résolues :

- la photo d'un groupe est « celle du premier exemplaire qui en a
  une » — un contournement écrit en v1.29 ;
- le bouton **« Copy to all copies »** des besoins existe
  **uniquement** parce qu'il n'y a pas d'objet modèle. Avec un vrai
  modèle, on déclare « un SM57 a besoin d'un XLR » une fois.

Un modèle porterait : la photo générique, les besoins, les notices et
fiches techniques, la marque et la référence. Chaque exemplaire en
hérite et peut surcharger.

C'est le seul chantier qui corrige une faiblesse **structurelle**
plutôt qu'un inconfort. Il passe en dernier parce qu'il ne soulage
aucune douleur immédiate, et parce qu'il sera plus facile à mener
quand le parc aura été dégraissé de ses deux cents câbles.

---

## Écarté, et pourquoi

Lu dans la documentation Snipe-IT, et laissé de côté pour un parc de
trois personnes :

| Fonction | Raison |
|---|---|
| **Requestable assets** — demander du matériel, un admin valide | Workflow d'entreprise ; ici c'est la même personne qui demande et qui décide |
| **EULA, multi-sociétés, LDAP, groupes de permissions** | Trois rôles en dur suffisent à trois personnes |
| **Alertes de stock bas sur consommables** | Reviendra avec la v2.7, qui leur donne enfin un stock |
| **Champs personnalisés** | Beaucoup de machinerie pour trois champs qu'on ajoute en dur en dix minutes |
| **Signature à la remise** | Vraiment utile pour un prêt à un tiers — à garder sous le coude, petit à construire |
| **Components** (le quatrième niveau : du stock qui s'installe DANS un objet et y reste — RAM, disques) | L'équivalent audio existe — lampes, capsules, accus de HF — mais il est rare, et un module 500 se modélise déjà mieux en caisse imbriquée |
| **Webhook Slack / Teams** | Un message dans un canal à chaque sortie. Remplacerait le « qui a pris le SM7B ? » — mais à trois personnes, le bruit l'emporterait probablement |
| **Purge des suppressions** | Snipe-IT la déconseille explicitement : la valeur du système est l'historique long, *y compris celui de ce qui n'existe plus*. Ici la corbeille marque « expiré » au bout de 30 jours sans rien effacer d'office — à garder ainsi, et à ne jamais automatiser |

---

## Un risque repéré en chemin, hors chantiers

La sauvegarde JSON exporte `photo` comme une **URL** vers le bucket
Supabase. Restaurée dans un projet neuf, ou si le bucket disparaît,
elle rend 650 fiches avec 650 images mortes — et personne ne s'en
aperçoit avant d'ouvrir une fiche.

C'est le même motif que les cinq tables qu'on a failli perdre une à
une. À vérifier dans le protocole de restauration, et à corriger
indépendamment des trois chantiers.
