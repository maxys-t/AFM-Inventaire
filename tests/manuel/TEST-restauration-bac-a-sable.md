# Tester une restauration en bac à sable

Objectif : vérifier, pendant que tout va bien, qu'une sauvegarde se remonte
réellement. Une restauration jamais essayée n'est pas une sauvegarde, c'est
une intention.

Compter une heure, dont beaucoup d'attente. **Rien de ce qui suit ne touche
au projet de production.**

---

## Ce que le test prouve — et ce qu'il ne prouve pas

| Vérifié | Non vérifié |
|---|---|
| Les vingt-trois migrations s'appliquent sur une base vierge | Les photos (elles ne sont pas dans le JSON — voir l'étape 9) |
| Le fichier de sauvegarde contient bien tout | Les comptes utilisateurs (recréés à la main) |
| L'import encaisse le volume réel (648 items, ~1000 lignes d'historique) | |
| Lieux, adresses, projets, historique, réparations, prestataires, poids, **packs et conditionnement** arrivent entiers | |

> **Ce test porte sur quatre correctifs successifs du même défaut.** La v1.12.2
> a rendu les adresses et les auteurs d'historique, la v1.18 les réparations
> et les prestataires, la v1.19 les poids. Chacun réparait une omission
> découverte par relecture, jamais par essai. C'est précisément ce que cette
> après-midi doit changer.

---

## Résultat du premier essai — 14 octobre 2026

**Verdict : aucune donnée perdue.** Les 649 items avec leurs poids et leur
conditionnement, les 8 packs et leurs 43 rangements, les 3 réparations, les
2 ateliers, le projet et les 1 496 lignes d'historique ont tous fait
l'aller-retour.

Mais l'essai a trouvé **cinq défauts**, tous invisibles sans lui :

| Défaut | Gravité | Corrigé en |
|---|---|---|
| L'export tronquait l'historique à 1 000 lignes | un tiers déjà perdu | v1.21.5 |
| Réimporter doublait l'historique | restauration non rejouable | v1.21.6 |
| Migrations 014, 015, 016 impossibles sur base vierge | remonter la base s'arrêtait à la 14ᵉ | v1.21.5 |
| « hors service » avait deux sens contradictoires | depuis la v1.17 | v1.21.5 |
| 1 item dans l'état interdit | à trancher à la main | — |

Le premier est le plus instructif. Les quatre correctifs de sauvegarde
antérieurs — v1.12.2, v1.18, v1.19, v1.20 — oubliaient chacun une table
entière, ce qui se voit au premier regard sur un fichier d'export. Celui-ci
coupait une table en plein milieu : aucune relecture ne l'aurait montré.

### Deux pièges à connaître pour la prochaine fois

**Les 4 lieux en trop ne sont pas un bug.** La migration 001 crée quatre
emplacements de démarrage — Rack A, Salle 1, Tiroir câbles XLR, Régie. Ils
s'ajoutent aux tiens. Les supprimer avant de comparer, ou en tenir compte.

**Ne pas enchaîner deux imports dans le même bac à sable.** Depuis la
v1.21.6 l'historique n'est plus doublé, mais repartir d'une base propre
reste la seule façon de comparer des chiffres qui veulent dire quelque chose.

---

## 0. Les chiffres de référence — production, 14 octobre 2026

| items | pesés | conditionnés | réparations | ateliers | packs | rangements | historique | lieux | projets |
|---|---|---|---|---|---|---|---|---|---|
| 649 | 633 | 7 | 3 | 2 | 8 | 43 | 1495 | 8 | 1 |

C'est à cette ligne que la restauration doit répondre, chiffre pour chiffre.
Tout écart est le sujet du test.

---

## 1. Créer le projet bac à sable

Le plan gratuit autorise **deux projets actifs**. Tu en as un, tu peux donc en
créer un second sans rien payer. Les projets en pause ne comptent pas dans
le quota.

Supabase → **New project** → nom `afm-sandbox` → région Europe, comme la
production → garder le mot de passe de base de données de côté.

Compter deux à trois minutes de mise en route.

---

## 2. Passer les migrations, dans l'ordre

SQL Editor du projet bac à sable. Coller et exécuter **un fichier à la fois**,
dans l'ordre numérique :

```
001-init                   010-codes-anglais
002-reparations            011-user-prefs
003-projets                012-lieux-projets
004-corbeille              013-adresses
005-comptes                014-rangement-familles
006-categories             015-peaux-consommables
007-owner-provider-price   016-reparations
008-sales-order-date       017-photos-multiples
009-photos-storage         018-poids
                           019-packs
                           020-codes-identifiants
                           021-packs-simplifies
                           022-conditionnement
                           023-conditionnement-detail
```

> **014, 015 et 020 ne feront rien** sur une base vide : ce sont des
> migrations de renumérotation, elles cherchent des items qui n'existent pas
> encore. C'est
> normal, et c'est voulu — elles doivent pouvoir tourner sans rien trouver.

Si l'un échoue, arrête-toi et note le message : c'est exactement le genre de
chose que ce test sert à découvrir maintenant plutôt qu'en situation.

> **Note sur `005-comptes.sql`** : il se termine par la création du premier
> administrateur, avec ton adresse en dur. Tu peux le laisser tel quel — c'est
> avec cette adresse que tu te connecteras au bac à sable.

---

## 3. Créer le bucket des photos

Storage → **New bucket** → nom `item-photos` → cocher **Public bucket**.

Sans lui, l'import passera quand même, mais les images resteront introuvables.

---

## 4. Se créer un compte dans le bac à sable

L'application n'a plus d'écran d'inscription depuis la v1.12. On crée donc le
compte directement :

Authentication → **Users** → **Add user** → **Create new user**
- Email : ton adresse habituelle
- Password : un mot de passe de test
- Cocher **Auto Confirm User**

La ligne `profiles` créée à l'étape 2 se rattachera toute seule à ce compte à
ta première connexion.

---

## 5. Préparer une copie locale de l'application

**C'est l'étape qui bloque si on ne la connaît pas.** L'application lit ses
identifiants Supabase depuis `js/config.js` en priorité ; l'écran « Supabase
connection » ne s'affiche donc jamais tant que ce fichier est rempli. Il faut
une copie séparée.

1. Sur GitHub, dépôt `AFM-Inventaire` → **Code** → **Download ZIP**
2. Décompresser dans un dossier, par exemple `~/Desktop/afm-sandbox`
3. Ouvrir `js/config.js` et remplacer les deux premières valeurs par celles du
   bac à sable (Supabase → Project Settings → API) :

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";   // celle du bac à sable
const SUPABASE_KEY = "sb_publishable_…";               // celle du bac à sable
```

4. Dans le même fichier, vider `APP_URL` pour qu'il n'y ait aucune ambiguïté :

```js
const APP_URL = "";
```

---

## 6. Lancer la copie locale

Terminal, une seule commande :

```bash
cd ~/Desktop/afm-sandbox && python3 -m http.server 8000
```

Puis ouvrir **http://localhost:8000** dans le navigateur.

> Passer par un petit serveur plutôt que d'ouvrir `index.html` directement :
> certains navigateurs refusent le stockage local sur un fichier ouvert en
> direct, et la session ne tiendrait pas.
>
> Pour arrêter le serveur ensuite : `Ctrl + C` dans le terminal.

Connecte-toi avec l'adresse et le mot de passe de l'étape 4. Tu dois arriver
sur un inventaire **vide** — c'est bon signe, tu es bien dans le bac à sable.

---

## 7. Importer la sauvegarde

Récupérer `backups/latest.json` depuis le dépôt de sauvegarde privé.

Dans la copie locale : **Settings → Data → Import JSON** → choisir le fichier.

La fenêtre de confirmation annonce les volumes. Si elle affiche bien tes 642
items, **629 poids** et tes dossiers de réparation, le fichier est lisible et
complet. Si un de ces nombres manque à l'appel, note-le : c'est une omission
d'export, et elle se corrige en quelques lignes.

---

## 8. Vérifier — la partie qui compte

| Où regarder | Ce qui doit être vrai |
|---|---|
| Inventory | Le bon nombre d'items, avec marques, prix et dates |
| Settings → Locations | Sites et salles séparés, hiérarchie correcte |
| Settings → Locations → Off-site | Les adresses extérieures, **avec leurs adresses détaillées** |
| Projects | Destination et dates présentes en colonnes |
| Projects → un projet → ✉️ Delivery details | Le brouillon contient l'adresse complète |
| Settings → Activity | Les lignes d'historique portent un auteur |
| Un item → sa fiche | Son historique est là |
| Inventory → colonne Weight | Les poids sont là, et le total d'une sélection tombe juste |
| Un item estimé → sa fiche | La mention « estimé » a survécu, pas seulement le chiffre |
| Repairs | Les dossiers ouverts, avec leur panne et leur prestataire |
| Repairs → Closed incidents | Les dossiers clos et leur constat de retour |
| Settings → Repair shops | Les ateliers, avec coordonnées et spécialité |
| Packs | L'arbre, avec les packs imbriqués à leur place |
| Un pack → sa fiche | Son contenu, son contenant et son poids total |
| Un item rangé → sa fiche | La ligne « In pack » |
| Inventory → colonne Case | Le conditionnement, avec son libellé |

Les trois derniers blocs sont les plus récents, donc les moins éprouvés : ce
sont eux qu'il faut regarder en premier.

**Le contrôle chiffré, plus rapide qu'un parcours à l'œil.** Dans le SQL Editor
du bac à sable :

```sql
select
  (select count(*) from items)                                  as items,
  (select count(*) from items where weight_g is not null)       as peses,
  (select count(*) from items where weight_est)                 as estimes,
  (select count(*) from repairs)                                as reparations,
  (select count(*) from repair_providers)                       as prestataires,
  (select count(*) from history)                                as historique,
  (select count(*) from locations)                              as lieux,
  (select count(*) from projects)                               as projets,
  (select count(*) from packs)                                  as packs,
  (select count(*) from pack_items)                             as rangements,
  (select count(*) from items where has_case)                   as conditionnes;
```

Lance exactement la même requête sur le projet de production et compare les
deux lignes. Elles doivent être identiques, chiffre pour chiffre. C'est le
test, et tout le reste n'est que confort.

---

## 9. Les photos, si tu veux aller au bout

Elles ne sont pas dans le JSON — la base ne contient que leurs adresses. Pour
un test complet :

Supabase bac à sable → Storage → `item-photos` → **Upload** → déposer le
contenu du dossier `photos/` du dépôt de sauvegarde, **en respectant les
sous-dossiers** (`models/…`).

Les images n'apparaîtront pas pour autant dans le bac à sable : les adresses
enregistrées en base pointent vers le projet de production. C'est normal et
sans conséquence — en vraie restauration, tu remonterais dans le même projet,
donc les adresses retomberaient juste.

Ce que cette étape vérifie réellement, c'est que les fichiers du dépôt sont
intacts et complets. Compare le nombre de fichiers envoyés avec le compteur de
`photos/manifest.json`.

---

## 10. Ranger derrière soi

Une fois le test concluant :

Supabase → projet `afm-sandbox` → Settings → General → **Pause project**
(il ne compte alors plus dans le quota de deux) ou **Delete project**.

Supprimer aussi le dossier local, il contient une clé d'un projet actif.

---

## Si quelque chose casse

Note ce qui a échoué et à quelle étape, et dis-le-moi. Un test de restauration
qui échoue est une bonne nouvelle déguisée : il vaut mieux le découvrir un
mardi tranquille que le jour où la base de production a un problème.
