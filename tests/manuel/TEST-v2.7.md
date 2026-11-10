# Protocole de test — v2.7 (trois niveaux de matériel)

Vingt minutes. La bascule est l'étape à faire posément — tout se
défait, mais autant ne pas avoir à le faire.

## Avant

1. **Exporte une sauvegarde** depuis Settings → Backup. Celle-ci
   compte : la migration supprime la table des consommables après
   les avoir repris.
2. Passe `sql/033-journal-des-migrations.sql` dans un **onglet neuf**.
   Elle crée le registre de ce qui est appliqué sur ta base et y
   inscrit les trente-deux précédentes. Les sentinelles du tableau
   final doivent toutes dire **ok**.
3. Passe `sql/034-accessoires-consommables.sql` dans un **autre
   onglet neuf**. Son tableau final : les quatre colonnes de contrôle
   à **ok**, et `consommables` autour de **57** — tes consommables de
   caisse, repris.
4. Pousse, recharge, vérifie **v2.7.0** en haut à gauche.

---

## 1. Tes consommables ont survécu

C'est la première chose à vérifier, avant tout le reste.

- Rail → **Consumables**.
- **Attendu** : tes 57 libellés sont là — « Cordes Guitar »,
  « Mediators », « Linvosges Towels »… avec **0 possédé** et une note
  disant que le stock est à renseigner.
- Ouvre une caisse qui en avait (Packs → une malle).
- **Attendu** : ses consommables figurent toujours dans sa dotation,
  aux mêmes quantités.

> Le stock part à zéro plutôt qu'inventé. L'app ne sait pas combien
> de médiators tu possèdes, et un chiffre faux serait pire que la
> question visible.

- Prends-en un qui est en réalité un accessoire — « Midi Din 5
  Cable » ou « USB C PSU » — ouvre-le, **Edit**, passe *Kind* à
  **Accessory**, enregistre.
- **Attendu** : il quitte Consumables pour Accessories. La migration
  n'a rien deviné à ta place ; c'est toi qui tranches.

## 2. Créer un accessoire, et voir à quoi il sert

- Rail → **Accessories** → **+ New accessory**.
- Nom `XLR 3 m`, possédés `40`, hors service `1`, poids unitaire
  `180 g`.
- **Attendu** dans le tableau : *Owned 40, HS 1, Free 39*.
- Ouvre une caisse → en bas, **Add to this case** → choisis-le,
  quantité `12`, **Add**.
- Recommence avec quantité `4` et la case **spare** cochée.
- **Attendu** : deux sections distinctes, *Accessories* et *Spares*,
  et sous chaque ligne « 39 usable · 39 free · 2,16 kg ».
- Essaie d'ajouter une troisième fois sans cocher *spare*.
- **Attendu** : refusé, avec la raison — l'objet apparaîtrait deux
  fois sur la checklist.

## 3. Ce qui rend la checklist définitive

- Retour à **Accessories**, ouvre la fiche du XLR.
- **Attendu** : « Asked for by 1 case », avec la caisse nommée et les
  deux lignes.
- Passe *Owned* à `10` (Edit).
- **Attendu** : un bandeau rouge — *les dotations réclament 16, 9
  seulement sont utilisables, 7 manquent*. Le tableau affiche
  **short 7**.
- **Le point du test** : cette alerte apparaît à la préparation, pas
  sur le quai. Remets 40.

## 4. Ce qui part vraiment

- Sors la caisse (Packs → **Send out**).
- Reviens sur la fiche du XLR.
- **Attendu** : *Out 16*, *Free 23*. Les seize sont physiquement
  partis ; vingt-trois restent au studio.
- Rentre la caisse.

## 5. Le poids et la checklist d'un projet

- Projects → un projet contenant cette caisse → **Start packing**.
- **Attendu** : sous les items, trois sections — *Accessories*,
  *Spares*, *Consumables* — avec des cases à cocher, et le poids des
  lignes pesées à droite.
- Regarde le poids total de la caisse.
- **Attendu** : il inclut les 2,88 kg des seize câbles.
- **Delivery email** : les trois sections y figurent aussi.

## 6. La bascule — l'étape à faire posément

- Rail → **Accessories** → **Convert items…**.
- **Attendu** : la liste de tes modèles, groupés par sous-catégorie,
  cochés d'office à partir de **3 exemplaires**. En haut, trois
  chiffres : modèles cochés, items qui quittent la liste, inventaire
  après.
- Vérifie que **les Bag, Flight cases et contenants n'y sont pas** —
  ils doivent garder leur fiche.
- Vérifie que **les pieds de micro sont décochés** : neuf modèles
  pour vingt exemplaires, c'est un choix, pas un bac.
- Si un modèle déclare des besoins, un bandeau le signale.

Commence petit :

- Décoche tout sauf **un** modèle de câble. Convertis.
- **Attendu** : un message, et dans le tableau une ligne comptée à la
  bonne quantité.
- Ouvre une caisse qui contenait ces câbles.
- **Attendu, et c'est l'étape qui compte** : ils y sont toujours,
  sous forme de **dotation** — pas disparus.
- Inventory : cherche l'un de ces câbles par son identifiant.
- **Attendu** : absent de la liste. Mais ouvre un vieux projet ou un
  historique qui le mentionne : son nom s'affiche toujours. Il est
  archivé, pas effacé.

Si tout est conforme, relance **Convert items…** et traite le reste.

## 7. La sauvegarde

- Settings → **Export backup**, ouvre le `.json`, cherche
  `supplies` et `supplyLines`.
- **Attendu** : tes lignes et tes dotations y sont.

---

## Si quelque chose cloche

Réimporte la sauvegarde du point 1, et dis-moi **à quelle étape** et
**ce que tu as vu**. Le numéro d'étape suffit à retrouver le code
concerné.
