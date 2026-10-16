# Protocole de test — v1.24 (contenants, caisses partagées, doublons)

Durée : vingt minutes. À faire **sur la production**, dans cet ordre.
Chaque étape dit ce qu'on attend ; si l'écran dit autre chose, note-le
et passe à la suivante — rien ici n'est destructeur, sauf l'étape 8,
qui se défait.

---

## Avant de commencer

1. **Exporte une sauvegarde** depuis Settings. Vérifie dans le message
   de fin que le compte d'items et de lignes d'historique correspond à
   ce que tu attends (≈ 649 et ≈ 1 500).
2. Passe `sql/026-contenants-partages.sql` dans Supabase.
   → Attendu : aucune erreur, et un `NOTICE` si un contenant portait
   déjà deux assemblages montés.
3. Pousse le code, recharge l'app, vérifie **v1.24.2** en haut à
   gauche. Si c'est encore l'ancienne version, vide le cache.

---

## 1. Le choix d'un contenant s'est raccourci

- Packs → **New pack** → clique le champ *Container*.
- **Attendu** : la liste ne propose que des sacs, flight cases, racks,
  racks 500, expansions, plateaux et meubles. Plus de micros.
- Coche **Show all items** → la liste complète revient.
- Ouvre la fiche d'un pack existant dont le contenant n'est PAS un
  sac — la **Lunchbox BAE**, la **SQ5+**.
- **Attendu** : son contenant est toujours affiché dans le champ, et
  modifiable. Rien n'a été perdu.

## 2. Deux configurations sur la même caisse

- Crée un pack **« Pelicase — essai »**, contenant = la Pelicase qui
  sert déjà à une autre caisse, **sans** cocher *Assembled*.
- **Attendu** : accepté.
- Modifie-le et coche **Assembled permanently**. Si l'autre pack sur
  cette caisse est déjà monté → **attendu** : refus, avec le nom de
  l'autre.
- Si l'autre n'est pas monté, le second assemblage passe : décoche
  l'un des deux pour revenir à l'état de départ.

## 3. Le poids ne s'effondre pas — **le point à vérifier en priorité**

Avec les deux configurations de l'étape 2 en place :

- Ouvre la fiche de la caisse **d'origine**.
- **Attendu** : son poids total est **celui d'avant**, inchangé. Note-le
  avant de créer la seconde configuration pour pouvoir comparer.
- Ouvre **« Pelicase — essai »**, qui est vide.
- **Attendu** : elle pèse **la boîte seule**, pas le contenu de l'autre.

C'est le défaut corrigé en v1.24.2 : chaque configuration pesait sa
boîte vide. Si tu vois un poids qui a fondu, arrête-toi là et dis-le.

- Supprime **« Pelicase — essai »** quand c'est vérifié.

## 4. L'arborescence des packs tient

- Onglet Packs, déplie tout.
- **Attendu** : les caisses imbriquées sont au bon endroit, les poids
  des racines sont ceux d'hier, le compteur d'incomplets ne compte que
  les assemblages **montés**.

## 5. Le doublon dans un projet

- Projects → **New project** → ajoute **deux caisses qui partagent un
  item** (si tu n'en as pas, ajoute temporairement un même micro aux
  deux depuis l'onglet Packs).
- **Attendu** : la seconde caisse affiche une section **« Already taken
  by another case »**, nomme l'objet et dit dans quelle caisse il part.
  Il ne disparaît plus en silence.
- Si un exemplaire libre du même modèle existe, un bouton **« Use
  XXX-00N »** apparaît. Clique-le.
- **Attendu** : le remplaçant rejoint la seconde caisse, le doublon
  disparaît, le total d'items monte de un, et un toast propose
  **Undo**. Teste l'annulation.
- Va dans l'onglet Packs : **attendu**, la recette n'a pas bougé — la
  caisse contient toujours l'item d'origine.

## 6. La page de préparation

- Ouvre un projet, **Preparing**.
- **Attendu** : chaque ligne porte sa **photo**, y compris les écartés ;
  les consommables ont un carré vide.
- Sous la liste, il ne reste que *Go on show* et *Pause*.
- Déplie **Project settings** → la note de livraison, dupliquer,
  archiver, remettre à zéro, supprimer.
- Clique **Reset checklist** après avoir coché deux ou trois lignes.
- **Attendu** : une confirmation annonce le nombre de lignes à
  décocher. Refuse une fois, accepte une fois.

## 7. Rien n'a cassé ailleurs

Trois sondages rapides :

- **Inventory** : le tri par la colonne *Condition* descend bien
  Good → Damaged → Faulty → Out of service.
- **Checked out** : les caisses sorties sont groupées et imbriquées,
  et *Check-in all* rentre toute la branche.
- **Dashboard** : le bloc Packs liste les caisses racines avec leur
  poids, et *Send out* ouvre la fenêtre de sortie.

## 8. Le vrai test, pour finir

Monte un projet réel que tu ferais vraiment partir — la prochaine
sortie, même lointaine. Compose-le, prépare-le, clique **Go on show**,
puis **Close show** dans la foulée.

- **Attendu** : les items passent sortis puis rentrent à leur
  emplacement d'origine, l'historique porte deux lignes par objet, et
  le projet revient à *Idle* avec sa checklist vide.
- **Attendu** aussi : pendant le show, vider une caisse dans l'onglet
  Packs ne change PAS ce que le projet dit être parti.

---

## Ce que ce protocole ne couvre pas

- Le comportement **sur iPad** : le glisser-déposer, le bandeau de
  projet en bas, les cibles tactiles. À refaire une fois sur la
  tablette, rapidement.
- La **restauration** d'une sauvegarde contenant des substitutions et
  des consommables : à inclure au prochain essai de bac à sable.
