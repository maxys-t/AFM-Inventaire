# Protocole de test — v1.28 (ranger dans les caisses, monter une caisse)

Dix minutes. Rien ici n'est destructeur : tout se défait.

## Avant

1. Exporte une sauvegarde depuis Settings.
2. Passe `sql/027-rangements-projet.sql` dans Supabase.
3. Pousse, recharge, vérifie **v1.28.0** en haut à gauche.

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
  l'item passe dessous, dans une section **Added for this project**.
- **Attendu** : le compte et le poids de la caisse montent d'autant.
  Le total du projet, lui, **ne bouge pas** — l'item était déjà du
  voyage, il a seulement trouvé sa place.

## 3. Rien n'a changé dans la recette — le point à vérifier

- Onglet **Packs**, ouvre cette caisse.
- **Attendu** : l'item rangé **n'y est PAS**. La recette est
  inchangée ; c'est ce projet-ci qui dit qu'il voyage dedans.

Si tu le vois apparaître dans la recette, arrête-toi et dis-le : c'est
exactement ce que la version promet de ne pas faire.

## 4. Depuis l'inventaire, directement dans une caisse

- Dans **Edit gear**, onglet **Items**, glisse un item de la colonne
  de gauche **directement sur une caisse** à droite.
- **Attendu** : il est ajouté au projet **et** rangé dans cette caisse
  d'un seul geste.

## 5. Ressortir, et retirer

- Clique le **⤺** d'un item rangé. **Attendu** : il revient sous
  *Loose items*.
- Range-en deux dans une caisse, puis retire la caisse du projet
  avec son **✕**. **Attendu** : les deux items retombent en vrac, et
  un message le dit. Aucun ne disparaît.

## 6. La préparation

- **Packing →**.
- **Attendu** : les items rangés sont listés **sous leur caisse**,
  avec la mention *added for this project*, et se cochent avec elle.
  Le « Tick all » de la caisse les coche aussi.

## 7. Le départ fige le chargement réel

- Coche tout, **Go on show**.
- Retourne au projet, **Edit gear** : impossible, c'est normal.
- Va dans l'onglet **Packs** et vide la caisse de son contenu.
- Reviens à la préparation du projet. **Attendu** : la caisse montre
  toujours ce qui est parti, rangements compris. Vider une caisse au
  studio ne réécrit pas ce qui roule.
- **Close show** pour rentrer tout le monde.

---

## Ménage

Supprime la caisse « Essai v1.28 » depuis l'onglet Packs, et retire du
projet ce que tu y as ajouté pour l'essai.
