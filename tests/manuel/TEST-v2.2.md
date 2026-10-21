# Protocole de test — v2.2 (les besoins : alimentations et cordons)

Quinze minutes. Rien ici n'est destructeur : tout se défait, et la
migration n'ajoute que du neuf.

## Avant

1. Exporte une sauvegarde depuis **Settings → Backup**.
2. Passe `sql/029-besoins-items.sql` dans l'éditeur SQL de Supabase.
3. Lance la vérification en bas du fichier. Attendu : la table
   `item_needs`, cinq contraintes `CHECK`, deux politiques.
4. Pousse, recharge, vérifie **v2.2.0** en haut à gauche.

> Si tu déploies **sans** lancer la migration, l'application doit
> tourner normalement et la carte *Needs* doit afficher quoi lancer.
> Ça vaut la peine de le vérifier une fois : c'est ce qui permet de
> pousser le code et la migration séparément.

---

## 1. Déclarer les besoins du Minimoog

- Inventory → ouvre le **Minimoog** → colonne de droite, carte
  **Needs**.
- Dans « pick a common one », choisis **External PSU brick**.
- **Attendu** : le libellé, la famille (*Power supplies*) et le poids
  se remplissent tout seuls. Tu peux les corriger — un cordon de 10 m
  n'a pas le poids de celui de 3 m.
- **Add**.
- Recommence avec **Schuko mains lead**.
- **Attendu** : deux lignes sous *Power supplies*, avec leur poids à
  droite.

Puis une saisie libre, pour vérifier qu'on n'est pas prisonnier de la
liste :

- Tape `Minimoog footswitch` dans le champ de texte, famille *Cables*,
  quantité 1, poids vide. **Add**.
- **Attendu** : une section *Cables* apparaît sous les alimentations.
  **L'ordre compte** — on branche avant de câbler.

## 2. Ce qui ne doit PAS s'être passé

- Va dans Inventory et cherche « PSU ».
- **Attendu** : aucun nouvel item. C'est tout le pari de la version —
  ton parc n'a pas grossi d'une ligne.

## 3. La caisse hérite toute seule

- Mets le Minimoog dans une caisse (Packs → une caisse → **+ Add
  items**), si ce n'est pas déjà le cas.
- Ouvre la fiche de la caisse.
- **Attendu** : un bloc *Power supplies* et un bloc *Cables*, sous le
  contenu. Tu n'as rien ajouté à la caisse : ils sont **déduits** de
  ce qu'elle contient.
- Regarde le poids de la caisse.
- **Attendu** : il a augmenté du poids des alimentations déclarées.

## 4. La fusion

- Ouvre un **deuxième** appareil rangé dans la **même** caisse et
  déclare-lui aussi une **Schuko mains lead**.
- Reviens sur la fiche de la caisse.
- **Attendu** : **une seule** ligne « Schuko mains lead × 2 ». Pas
  deux lignes. Une checklist se coche en comptant.

## 5. Le retrait, sans nettoyage

C'est le point le plus important du protocole : il vérifie qu'il n'y a
rien à synchroniser.

- Retire le Minimoog de la caisse.
- **Attendu** : le *External PSU brick* disparaît du bloc, et la
  Schuko retombe à **× 1**.
- Rouvre la fiche du Minimoog.
- **Attendu** : ses deux besoins sont **intacts**. Rien n'a été
  supprimé — ils n'étaient simplement plus réclamés par cette caisse.
- Remets le Minimoog dans la caisse : tout revient.

## 6. La préparation d'un projet

- Projects → un projet en **Packing** contenant cette caisse →
  **Start packing**.
- **Attendu** : sous les items de la caisse, une section *Power
  supplies* et une section *Cables*, avec des cases à cocher.
- Regarde le compteur du bloc (`x/y`).
- **Attendu** : `y` compte les besoins. Coche-les tous **sauf un**.
- **Attendu** : la barre n'atteint pas 100 %. Une caisse sans son
  alimentation n'est pas une caisse finie.

## 7. Le départ fige tout

- **Go on show** sur ce projet.
- Retourne déclarer une alimentation de plus sur le Minimoog.
- Rouvre le projet parti.
- **Attendu** : la nouvelle ligne **n'y est pas**. Ce qui est parti
  est parti.
- Repasse le projet en *Packing* : elle réapparaît.

## 8. La recopie

- Prends un item qui a des exemplaires (« SM57 #1 » par exemple) et
  déclare-lui un **XLR 3 m**.
- Clique **Copy to the N other copies**.
- Lis la confirmation : elle doit dire que **rien n'est écrasé**.
- Confirme, puis ouvre « SM57 #2 ».
- **Attendu** : il a l'XLR.
- Ajoute-lui un besoin qu'il est seul à avoir, retourne sur #1 et
  recopie à nouveau.
- **Attendu** : le besoin propre à #2 est **toujours là**. La recopie
  ajoute ce qui manque, elle ne remplace pas.

## 9. Le mail de livraison

- Projects → ton projet → **Delivery email**.
- **Attendu** : sous chaque caisse, les alimentations et les cordons
  listés. C'est ce qu'on cherche sur un quai quand rien ne s'allume.

## 10. La sauvegarde

Le test qui a déjà rattrapé quatre tables.

- Settings → **Export backup**.
- Ouvre le fichier `.json` dans un éditeur, cherche `"needs"`.
- **Attendu** : tes déclarations y sont.

---

## Si quelque chose cloche

Rien de ce protocole n'est destructeur. En cas de doute : réimporte ta
sauvegarde du point 1, et dis-moi **à quelle étape** ça a lâché et
**ce que tu as vu** — le numéro de l'étape suffit à retrouver le code
concerné.
