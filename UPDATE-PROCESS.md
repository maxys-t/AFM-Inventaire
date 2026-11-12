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
      - **Ne jamais modifier un fichier directement dans GitHub.** L'éditeur
        du site ne lance aucun test : une accolade oubliée dans `config.js`
        empêche le fichier de se parser, et toute l'application tombe —
        c'est arrivé le 12 novembre 2026. Les harnais chargent `config.js`
        en premier et auraient refusé de passer.
      - Modifier en local, lancer `./tests/run.sh`, puis pousser. C'est la
        seule étape qui sépare une faute de frappe d'une panne en ligne.
- [ ] **5. Ajouter une entrée en haut du `CHANGELOG.md`** : la nouvelle version,
      la date, et les changements regroupés (Ajouté / Modifié / Corrigé).
- [ ] **6. Mettre à jour le `README.md` — SEULEMENT si** le fonctionnement ou
      l'architecture a changé. Pour une simple correction ou un ajustement visuel,
      on n'y touche pas.
- [ ] **7. Si la version ajoute une migration SQL**, la passer dans Supabase
      AVANT de déployer le code, et après avoir exporté une sauvegarde.
      Le code neuf lit des colonnes que l'ancienne base n'a pas.
      - **Un onglet neuf par migration**, nommé comme le fichier. Jamais
        recoller par-dessus un onglet existant : une version périmée y
        traîne toujours, et un texte plus court laisse des lignes
        orphelines en bas. C'est ce qui a fait échouer la 031 deux fois.
      - **Le fichier du dépôt fait foi.** Une migration corrigée dans
        Supabase mais pas dans Git, c'est une divergence que personne ne
        retrouve six mois plus tard.
      - **Chaque migration s'enregistre elle-même** dans
        `schema_migrations` (voir la 033). Ce journal est la seule réponse
        à « qu'est-ce qui est passé sur cette base ? » :

        ```sql
        select id, name, applied_at, note
          from public.schema_migrations order by id;
        ```
      - **Une migration déjà jouée ne se relance pas.** Le dossier `sql/`
        est un historique, pas une liste de tâches : la 030 décrit un état
        que la 031 a remplacé, la rejouer ne peut qu'échouer.
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
