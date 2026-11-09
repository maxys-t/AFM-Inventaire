# Protocole de test — v2.6 (ce que la vraie préparation a révélé)

Dix minutes. Rien de destructeur.

## Avant

1. Exporte une sauvegarde depuis **Settings → Backup**.
2. Passe `sql/032-dossiers-et-retour.sql` dans un **onglet neuf** de
   l'éditeur SQL de Supabase.
3. Le script se termine par un tableau : les quatre colonnes de
   contrôle doivent dire **ok**.
4. Pousse, recharge, vérifie **v2.6.0** en haut à gauche.

---

## 1. Créer un dossier, y glisser des caisses

- Packs → **+ New folder** → nomme-le `LEASH Touring`.
- **Attendu** : le tiroir apparaît, **vide**, et dit « Empty — drag a
  case here ». C'est tout l'intérêt : il existe avant d'avoir un
  contenu.
- Attrape une caisse LEASH par sa poignée ⠿ et lâche-la **n'importe
  où sur le bloc du dossier**, pas seulement sur son titre.
- **Attendu** : le tiroir entier s'allume en vert pendant le survol,
  et le fantôme annonce « → LEASH Touring ». Après la dépose, un
  bouton **Undo** reste disponible quelques secondes.
- Recommence avec deux ou trois autres caisses.
- Clique le titre du dossier.
- **Attendu** : il se replie, en gardant son compte et ses alertes —
  un coup d'œil doit suffire même fermé.

Puis l'inverse :

- Déplie-le, et glisse une caisse vers le bloc **« Not in a folder »**
  en haut.
- **Attendu** : elle en ressort. Il n'y a pas de bouton « retirer du
  dossier » — la racine est une zone de dépôt comme une autre.

Et ce qui doit être refusé :

- Ouvre une caisse, attrape un **item** dedans, et traîne-le sur un
  dossier.
- **Attendu** : le tiroir s'allume en **rouge** et le fantôme dit
  « only a case goes in a folder ». Le refus arrive pendant le
  survol, pas après la dépose.

Enfin :

- **✎** sur un dossier le renomme, **✕** le supprime.
- **Attendu sur ✕** : la confirmation annonce que les caisses
  remontent en haut de la liste et que rien n'est supprimé. Vérifie
  qu'elles y sont bien.
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
