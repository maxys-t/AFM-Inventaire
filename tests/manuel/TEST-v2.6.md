# Protocole de test — v2.6 (ce que la vraie préparation a révélé)

Dix minutes. Rien de destructeur.

## Avant

1. Exporte une sauvegarde depuis **Settings → Backup**.
2. Passe `sql/032-dossiers-et-retour.sql` dans un **onglet neuf** de
   l'éditeur SQL de Supabase.
3. Le script se termine par un tableau : `colonne_dossier` et
   `colonne_retour` doivent dire **ok**.
4. Pousse, recharge, vérifie **v2.6.0** en haut à gauche.

---

## 1. Ranger les caisses

- Packs → ouvre **LEASH Touring - SQ5+ Kit** → **Edit**.
- Nouveau champ **Folder** : tape `LEASH Touring`. Enregistre.
- Recommence sur deux ou trois autres caisses LEASH. À partir de la
  deuxième, le nom est proposé dans la liste — tu n'as plus qu'à le
  choisir.
- **Attendu** : un en-tête « LEASH Touring » apparaît dans la liste,
  avec le nombre de caisses, et les alertes s'il y en a.
- Clique l'en-tête.
- **Attendu** : le dossier se replie. Son compte reste lisible — un
  coup d'œil doit suffire même fermé.

Puis la règle qui compte :

- Regarde les caisses **sans** dossier (AF Sidecar, dLive DM0…).
- **Attendu** : elles sont **en tête, à plat, sans en-tête**. Pas de
  tiroir « Ungrouped ». Un parc qui n'utilise pas les dossiers ne
  doit pas en payer le niveau de titre.

- Tape `K10` dans la recherche.
- **Attendu** : les dossiers disparaissent, la liste est à plat. On
  cherche justement parce qu'on ne sait pas où c'est rangé.

## 2. L'e-mail de livraison

- Projects → un projet avec une destination et des dates →
  **Delivery email**.
- **Attendu, dans l'ordre** : le nom du projet souligné, un bloc
  **DELIVER TO** avec l'adresse, un bloc **RETURN TO** avec celle du
  studio, les dates **au format `12/11/2026`**, puis le chargement.
- Regarde chaque caisse : son nom est un **titre en capitales**, son
  contenu une liste à tirets, ses alimentations sous une rubrique
  nommée.
- **Attendu, et c'est le point** : **aucune ligne ne commence par une
  espace**. Envoie-toi le message pour de vrai et ouvre-le sur ton
  téléphone — c'est là que le problème se voyait. Une seule police,
  une seule taille.

## 3. Ramener ailleurs

- Projects → ton projet → **Settings** → nouveau champ **Return to**.
- Par défaut il affiche « — AccessFlow, as usual — » : il te dit ce
  qui partira dans le mail, sans que tu aies à deviner.
- Choisis un autre lieu, rouvre le **Delivery email**.
- **Attendu** : le bloc RETURN TO porte cette adresse.
- Remets le champ à vide → le studio revient.

## 4. L'écran de composition

C'est le point qui t'a fait poser l'iPad.

- Projects → un projet avec au moins trois ou quatre caisses →
  **Edit gear**.
- Fais défiler vers le bas jusqu'à la dernière caisse.
- **Attendu** : les onglets *Items / Packs* et le champ de recherche
  **restent visibles à gauche**. Tu peux attraper un item et le
  glisser sans avoir à remonter.
- Sur une caisse de droite, clique le chevron ▾ de son titre.
- **Attendu** : elle se replie sur son titre, qui garde son compte et
  son poids.
- **Glisse un item depuis la gauche sur cette caisse repliée.**
- **Attendu, et c'est important** : il y entre quand même. Replier ne
  doit pas revenir à s'interdire d'y ranger quelque chose.
- Bouton **Fold all** / **Unfold all** dans le bandeau de résumé.

## 5. Les vignettes vides

- Projects → un projet en **Packing** contenant un item qui déclare
  une alimentation (un IEC C13, par exemple).
- Regarde les lignes sous *Power supplies*.
- **Attendu** : **pas de carré gris** à leur gauche. Elles n'ont pas
  de fiche, donc pas de place réservée à une image — comme les
  consommables juste en dessous.

---

## Si quelque chose cloche

Dis-moi **à quelle étape** et **ce que tu as vu**. Le numéro d'étape
suffit à retrouver le code concerné.
