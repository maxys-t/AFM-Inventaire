# Protocole de test — v2.4 (un item attitré à un autre)

Dix minutes, sur ton vrai cas : le Germanium Preamp/DI et son PSU.

## Avant

1. Exporte une sauvegarde depuis **Settings → Backup**.
2. Passe `sql/030-items-lies.sql` dans l'éditeur SQL de Supabase.
3. Lance les deux premières requêtes de vérification en bas du
   fichier. Attendu : l'index `item_needs_un_seul_parent` et le
   déclencheur `item_needs_cycle`.
4. Pousse, recharge, vérifie **v2.4.0** en haut à gauche.

---

## 1. Déclarer le lien

- Inventory → **Germanium Preamp/DI** → carte **Needs**.
- En bas : **Or link a tracked item**. Tape « Germanium » dans le
  champ — la liste se filtre toute seule.
- Choisis **Germanium PSU**, puis **Link**.
- **Attendu** : une section *Linked gear* apparaît **au-dessus** des
  alimentations ordinaires, avec le nom du PSU, son identifiant et
  son poids. Le nom est cliquable.

## 2. Le sens inverse

- Clique sur **Germanium PSU** dans cette ligne.
- **Attendu** : sur sa fiche, un bandeau en tête de la carte *Needs* :
  « Required by Germanium Preamp/DI ». C'est ce qui doit t'arrêter si
  quelqu'un te demande ce PSU la veille d'une tournée.

## 3. Ce qui ne doit PAS être proposé

- Reste sur la fiche du PSU, champ **Or link a tracked item**, tape
  « Germanium ».
- **Attendu** : le preamp **n'est pas** dans la liste. Le lien ferait
  une boucle, donc on ne le propose pas plutôt que de refuser après
  coup.
- Ouvre un troisième item quelconque et cherche « Germanium PSU ».
- **Attendu** : absent aussi. Il est déjà attitré, et un item lié n'a
  qu'un parent.

## 4. La sortie

- Retour sur le **Germanium Preamp/DI** → **Check out**, destination
  « Essai v2.4 », valide.
- **Attendu** : un message « 1 linked item went out too: Germanium
  PSU ».
- Ouvre la fiche du **PSU**.
- **Attendu** : il est **sorti**, à la même destination. Dans son
  historique : « Essai v2.4 — went out with Germanium Preamp/DI ».
  C'est cette mention qui rendra la ligne lisible dans six mois.

## 5. Le retour, et sa nuance

- Sur le preamp → **Check in**, et **change son état** en *Damaged,
  usable* avec une note.
- **Attendu** : un message « 1 linked item came back too ».
- Ouvre le **PSU**.
- **Attendu, et c'est le point du test** : il est rentré, mais son
  état est **toujours Good**. L'état que tu as saisi décrivait le
  préampli que tu avais dans les mains, pas son alimentation. Sans
  cette nuance tu aurais une fausse réparation à ouvrir.
- Remets le preamp en *Good* pour la suite.

## 6. Le PSU déjà pris ailleurs

- Sors le **PSU seul** (depuis sa fiche), destination « Prêt ».
- Puis sors le **preamp**.
- **Attendu** : la sortie du preamp se fait, **et** un avertissement
  « Germanium PSU — needed, but already out. Check it separately. »
  L'application ne bloque pas une sortie pour ça, elle te le dit.
- Rentre les deux.

## 7. La caisse

- Mets le preamp dans une caisse (Packs → **+ Add items**), si ce
  n'est pas déjà fait.
- **Attendu** : le **PSU apparaît dans le contenu de la caisse**,
  alors que tu ne l'y as jamais ajouté. Le poids de la caisse inclut
  le sien.
- Retire le preamp de la caisse.
- **Attendu** : le PSU disparaît aussi. Et sur la fiche du preamp, la
  déclaration est intacte — rien n'a été supprimé.

## 8. Le projet

- Ajoute le preamp à un projet en **Packing**, en item isolé.
- **Attendu** : le PSU est dans la checklist, une seule fois même si
  la caisse du projet contient déjà le preamp.

## 9. La sauvegarde

- Settings → **Export backup**, ouvre le `.json`, cherche
  `needs_item_id`.
- **Attendu** : ton lien y est.

---

## Si quelque chose cloche

Rien n'est destructeur. Réimporte ta sauvegarde du point 1 si
nécessaire, et dis-moi **à quelle étape** et **ce que tu as vu** — le
numéro d'étape suffit à retrouver le code concerné.
