# Protocole de test — v2.5 (les lots indissociables)

Dix minutes, sur tes deux vrais cas : les Amphion et le Germanium.

## Avant

1. **Exporte une sauvegarde** depuis Settings → Backup. Celle-ci
   compte plus que d'habitude : la migration supprime une colonne.
2. Passe `sql/031-lots-indissociables.sql` dans l'éditeur SQL de
   Supabase.
3. Lance les trois requêtes de vérification en bas du fichier.
   **Attendu** :
   - tes lots, avec leurs membres — si tu avais déjà lié le
     Germanium, il doit apparaître **converti tout seul** ;
   - aucune ligne pour `needs_item_id` (la colonne a disparu) ;
   - aucune ligne pour les items en double.
4. Pousse, recharge, vérifie **v2.5.0** en haut à gauche.

> La 030 reste dans le dossier : elle a été jouée, l'historique doit
> se relire. La 031 part de l'état qu'elle a laissé.

---

## 1. Le lot se lit depuis n'importe quel membre

- Inventory → **Amphion #1** → carte **Travels together**.
- Ajoute **Amphion #2**, puis **Amp 700**.
- **Attendu** : trois lignes, celle de l'item courant marquée
  « this one ». Chaque autre nom est cliquable, et la colonne de
  droite dit où il se trouve.
- Ouvre l'**Amp 700**.
- **Attendu, et c'est le point de la version** : la carte dit
  **exactement la même chose** — les trois membres, sans hiérarchie.
  Pas de « required by », pas de parent. C'est la même relation, lue
  de l'autre bout.

## 2. Ce qui n'est pas proposé

- Sur l'Amphion #1, champ d'ajout, cherche **Amphion #2**.
- **Attendu** : absent. Il est déjà dans le lot.
- Ouvre un item quelconque hors du lot et cherche **Amp 700**.
- **Attendu** : absent. Un item n'appartient qu'à un lot.

## 3. La sortie

- Sélectionne **l'Amphion #1 seul** → **Check out**, destination
  « Essai v3 ».
- **Attendu** : un message « 2 items travel with these: Amphion #2,
  Amp 700 ».
- Ouvre l'**Amp 700**.
- **Attendu** : sorti, même destination. Historique : « Essai v3 —
  went out with Amphion #1 + Amphion #2 + Amp 700 ». C'est le **lot**
  qui est nommé, pas un parent — il n'y en a plus.

## 4. Le retour, et sa nuance

- Rentre **l'Amphion #1 seul**, en le déclarant *Damaged, usable*
  avec une note.
- **Attendu** : « 2 items came back with them ». Les trois sont
  rentrés d'un bloc.

> La v2.5 retenait l'ampli tant qu'une autre enceinte était dehors.
> Cette règle n'existe plus : un lot ne se divise pas.

- Ouvre l'**Amp 700**.
- **Attendu** : rentré, et son état est **toujours Good**. L'état que
  tu as saisi décrivait l'enceinte que tu avais dans les mains.
- Remets l'Amphion #1 en *Good*.

## 5. La caisse

- Mets **l'Amphion #1 seul** dans une caisse.
- **Attendu** : les trois apparaissent dans son contenu, et le poids
  de la caisse les compte tous les trois.
- Retire l'Amphion #1 de la caisse.
- **Attendu** : les trois disparaissent. Et le lot est intact sur
  leurs fiches — rien n'a été supprimé.

## 6. Le projet

- Ajoute **l'Amphion #2 seul** à un projet en *Packing*, en item
  isolé.
- **Attendu** : les trois sont dans la checklist, **une seule fois
  chacun**, même si la caisse du projet en contient déjà.

## 7. Dissoudre

- Sur n'importe quel membre, retire l'**Amp 700** du lot (bouton ✕).
- **Attendu** : il reste un lot de deux enceintes, et l'Amp 700
  redevient libre.
- Retire encore une enceinte.
- **Attendu** : « Set dissolved — a set of one is not a set. » Le lot
  disparaît plutôt que de laisser une coquille.
- Reconstitue le lot des trois pour la suite.

## 8. Les besoins ordinaires n'ont pas bougé

- Ouvre le **Germanium Preamp/DI** → carte **Needs**.
- **Attendu** : ses cordons (IEC C13…) sont toujours là, sous *Power
  supplies*. Eux restent dirigés — un appareil a besoin d'un cordon,
  un cordon n'a besoin de rien.

## 9. La sauvegarde

- Settings → **Export backup**, ouvre le `.json`, cherche
  `linkMembers`.
- **Attendu** : tes lots y sont.

---

## Si quelque chose cloche

Réimporte la sauvegarde du point 1, et dis-moi **à quelle étape** et
**ce que tu as vu**. Le numéro d'étape suffit à retrouver le code
concerné.
