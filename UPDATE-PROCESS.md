# Update Process

Petit rituel à suivre **à chaque modification** du projet, pour garder les versions
cohérentes et l'historique clair. Ça prend une minute et évite bien des confusions.

## Le principe

Trois choses doivent toujours rester synchronisées : le numéro de version dans le
code, le journal des changements, et l'historique Git. On les met à jour ensemble,
dans le même geste, jamais séparément.

## La checklist

- [ ] **1. Choisir le nouveau numéro de version** (voir règle ci-dessous)
- [ ] **2. Incrémenter le `?v=`** dans `index.html` (ex : `?v=0.6.1` → `?v=0.6.2`)
      pour forcer les navigateurs à recharger les fichiers au lieu du cache.
- [ ] **3. Ajouter une entrée en haut du `CHANGELOG.md`** : la nouvelle version,
      la date, et les changements regroupés (Ajouté / Modifié / Corrigé).
- [ ] **4. Mettre à jour le `README.md` — SEULEMENT si** le fonctionnement ou
      l'architecture a changé. Pour une simple correction ou un ajustement visuel,
      on n'y touche pas.
- [ ] **5. Commit Git** avec un message clair reprenant la version
      (ex : `v0.6.2 — correction filtre Sortis`).
- [ ] **6. Uploader / déployer** sur GitHub Pages.

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
