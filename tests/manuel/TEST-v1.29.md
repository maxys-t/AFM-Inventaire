# Protocole de test — v1.29 (mettre dans les caisses, monter une caisse)

Dix minutes. Rien ici n'est destructeur : tout se défait.

## Avant

1. Exporte une sauvegarde depuis Settings.
2. Passe `sql/027-rangements-projet.sql` **puis** `sql/028-rangements-retires.sql`
   dans Supabase. La seconde défait la première : la 027 reste dans le
   dossier pour que l'historique se relise.
3. Pousse, recharge, vérifie **v1.29.0** en haut à gauche.

---

## 1. Monter une caisse depuis le projet

- Projects → ouvre un projet → **Edit gear** → onglet **Packs**.
- **Attendu** : tout en haut de la liste, avant les caisses existantes,
  un bouton **+ New case**.
- Clique-le, nomme la caisse (« Essai v1.28 »), choisis un contenant,
  laisse *Assembled* décoché, enregistre.
- **Attendu** : la caisse apparaît dans le panneau de droite, déjà
  ajoutée au projet.
- Va dans l'onglet **Packs** de l'application.
- **Attendu** : elle y est aussi. C'est une vraie caisse — c'est le
  point de toute la version.

## 2. Ranger un item dans une caisse

- Retour au projet, **Edit gear**, onglet **Items** : ajoute deux ou
  trois items (bouton **+**). Ils apparaissent à droite sous **Loose
  items**.
- Glisse l'un d'eux — par sa poignée ⠿, ou par appui long sur iPad —
  sur une caisse du panneau de droite.
- **Attendu** : la caisse **s'allume** pendant le survol. Au lâcher,
  l'item passe dans le contenu de la caisse.
- **Attendu** : le compte et le poids de la caisse montent d'autant.
  Le total du projet, lui, **ne bouge pas** — l'item était déjà du
  voyage, il a seulement trouvé sa place.

## 3. La recette a bien changé — le point à vérifier

- Onglet **Packs**, ouvre cette caisse.
- **Attendu** : l'item y est, pour de bon. Une caisse, c'est ce qu'il
  y a dedans — il repartira avec elle la prochaine fois.
- **Attendu aussi** : un toast **Undo** l'a proposé pendant douze
  secondes. Refais le geste et annule : la recette revient à l'état
  d'avant, et l'item retrouve sa place parmi les items isolés.

## 4. Depuis l'inventaire, directement dans une caisse

- Dans **Edit gear**, onglet **Items**, glisse un item de la colonne
  de gauche **directement sur une caisse** à droite.
- **Attendu** : il est ajouté au projet **et** rangé dans cette caisse
  d'un seul geste.

## 5. Le défilement ne saute plus

- Fais défiler la colonne de gauche jusqu'au milieu, puis ajoute un
  item avec le **+**.
- **Attendu** : la liste **reste où elle était**. C'était le défaut de
  la v1.28 — chaque ajout renvoyait tout en haut.

## 6. La préparation

- **Packing →**.
- **Attendu** : l'item ajouté est listé sous sa caisse, comme le
  reste de son contenu, et se coche avec elle.

## 7. Le départ fige le chargement réel

- Coche tout, **Go on show**.
- Retourne au projet, **Edit gear** : impossible, c'est normal.
- Va dans l'onglet **Packs** et vide la caisse de son contenu.
- Reviens à la préparation du projet. **Attendu** : la caisse montre
  toujours ce qui est parti. Vider une caisse au
  studio ne réécrit pas ce qui roule.
- **Close show** pour rentrer tout le monde.

---

## Ménage

Supprime la caisse « Essai v1.28 » depuis l'onglet Packs, et retire du
projet ce que tu y as ajouté pour l'essai.
