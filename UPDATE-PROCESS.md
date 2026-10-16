# Update Process

Petit rituel à suivre **à chaque modification** du projet, pour garder les versions
cohérentes et l'historique clair. Ça prend une minute et évite bien des confusions.

## Le principe

Trois choses doivent toujours rester synchronisées : le numéro de version dans le
code, le journal des changements, et l'historique Git. On les met à jour ensemble,
dans le même geste, jamais séparément.

## La checklist

- [ ] **1. Choisir le nouveau numéro de version** (voir règle ci-dessous)
- [ ] **2. Mettre `APP_VERSION`** à cette valeur, en tête de `js/app.js`.
      C'est elle que l'application affiche et compare pour proposer un
      rechargement quand une nouvelle version est en ligne.
- [ ] **3. Incrémenter le `?v=`** dans `index.html` (ex : `?v=0.6.1` → `?v=0.6.2`)
      pour forcer les navigateurs à recharger les fichiers au lieu du cache.
      **Tous** les `?v=` doivent valoir `APP_VERSION` — sinon le navigateur
      sert un mélange d'ancien et de neuf, et le défaut est introuvable.
- [ ] **4. Lancer les tests** : `./tests/run.sh`. Ils vérifient entre autres
      le point précédent. On ne livre pas avec un harnais en échec.
- [ ] **5. Ajouter une entrée en haut du `CHANGELOG.md`** : la nouvelle version,
      la date, et les changements regroupés (Ajouté / Modifié / Corrigé).
- [ ] **6. Mettre à jour le `README.md` — SEULEMENT si** le fonctionnement ou
      l'architecture a changé. Pour une simple correction ou un ajustement visuel,
      on n'y touche pas.
- [ ] **7. Si la version ajoute une migration SQL**, la passer dans Supabase
      AVANT de déployer le code, et après avoir exporté une sauvegarde.
      Le code neuf lit des colonnes que l'ancienne base n'a pas.
- [ ] **8. Commit Git** avec un message clair reprenant la version
      (ex : `v0.6.2 — correction filtre Sortis`).
- [ ] **9. Uploader / déployer** sur GitHub Pages.

## Quel numéro choisir ? (MAJEUR.MINEUR.CORRECTIF)

- **Correctif** (0.6.1 → 0.6.**2**) : petite correction ou ajustement visuel,
  rien ne change dans le fonctionnement.
- **Mineur** (0.6.x → 0.**7**.0) : nouvelle fonctionnalité qui ne casse pas l'existant.
- **Majeur** (0.x → **1**.0.0) : changement profond qui transforme l'app
  (ex : arrivée des comptes utilisateurs).

## À retenir

Le **CHANGELOG** raconte l'histoire du projet (il grossit à chaque version).
Le **README** décrit le projet tel qu'il est (il reste stable).
Ne pas confondre les deux : une nouvelle version = toujours une ligne de CHANGELOG,
mais pas forcément une modification du README.
