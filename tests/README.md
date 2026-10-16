# Les tests

Vingt harnais, un par version qui a introduit quelque chose de
délicat. Ils ne remplacent pas l'essai à la main : ils garantissent
qu'une correction d'hier n'est pas défaite aujourd'hui.

## Les lancer

```bash
./tests/run.sh          # tous
./tests/run.sh t124     # un seul
node tests/t124.js      # le détail, ligne par ligne
```

Le premier lancement installe `jsdom` — la seule dépendance, et elle
appartient aux tests, pas à l'application. **L'application n'a aucune
dépendance et ne doit pas en avoir** : c'est ce qui permet de la
déposer sur GitHub Pages sans rien construire.

Un harnais affiche ses vérifications groupées par sujet, puis
`=== ALL_OK ===` ou le nombre d'échecs. `run.sh` ne montre que les
lignes en échec.

## Ce qu'ils font

Chaque harnais charge les **vrais fichiers** de `js/` dans un faux
navigateur, appelle leurs fonctions et regarde ce qu'elles rendent.
Aucun ne touche à Supabase : la couche réseau est remplacée par des
fonctions qui enregistrent ce qu'on leur demande. Il n'y a donc ni
compte, ni base, ni risque — on peut les lancer autant qu'on veut.

Chacun se termine par une section « Cohérence des fichiers » qui
relit le code et les migrations : une colonne SQL attendue, une
fonction appelée, et surtout **la version** — tous les `?v=` de
`index.html` doivent valoir `APP_VERSION`. C'est cette dernière
vérification qui évite de livrer une version dont le navigateur
continue de servir l'ancien fichier.

| Harnais | Ce qu'il protège |
|---|---|
| t110 | Colonnes, séparateurs, préférences d'affichage |
| t111 | Lieux, hors-site, archivage, dates, mail de livraison |
| t112 | Mot de passe, adresses, emprunteurs, retour groupé |
| t1121 | Correspondance des photos par niveau de précision |
| t1122 | La restauration ne perd rien |
| t113 | Blocage de sortie, libellés |
| t1131 | Matériel abîmé : avertir, puis laisser choisir |
| t114 | Ordre d'affichage des familles |
| t115 | Tri et filtres depuis les en-têtes |
| t116 | Mobile, tablette, infobulles |
| t117 | Réparations : dossiers, prestataires, retour |
| t119 | Poids : lecture tolérante, affichage, totaux |
| t1193 | Détection d'une nouvelle version en ligne |
| t120 | Packs : arbre, poids, boucles, appui long, défilement |
| t121 | Conditionnement, sorties groupées, exemplaires |
| t122 | Packs-recettes, consommables, composition d'un projet |
| t123 | Les quatre états, sortie d'une caisse signalée |
| t124 | Contenants, caisse partagée, doublons de projet |
| t127 | La feuille de style : toutes les couleurs dans la palette |
| t128 | Ranger les items d'un projet dans ses caisses |

## En écrire un

Reprends le plus récent et remplace les trois blocs : `STUBS` (ce
qu'on remplace), `DATA` (un inventaire miniature), `TESTS` (les
vérifications). Puis, après l'`eval`, la section fichiers.

Trois règles apprises à nos dépens :

**Tester un comportement, pas une phrase.** Plusieurs assertions ont
cherché un mot dans un commentaire que je venais d'écrire. Elles
passaient toujours, et ne protégeaient rien. Une assertion doit
appeler une fonction et regarder ce qu'elle rend.

**Un seul `eval`.** Les déclarations `let` et `const` d'un `eval`
global ne sont pas visibles depuis l'`eval` suivant — tout doit
partir dans le même appel, dans l'ordre : remplacements, `config.js`,
`helpers.js`, les vues utiles, les données, les tests.

**Extraire plutôt que charger.** Une vue qui touche au DOM d'un onglet
absent plante au chargement. On en extrait alors la fonction à tester
avec une expression régulière, comme le font t121 et t124.

## Ce qu'ils ne couvrent pas

Le rendu réel — tailles, chevauchements, ce qui se coupe. jsdom ne
calcule aucune mise en page. Le glisser-déposer au doigt sur une vraie
tablette. Et tout ce qui touche à Supabase : les règles d'accès, les
déclencheurs, les migrations.

Ces trois domaines se vérifient à la main, et les marches à suivre
sont dans `manuel/` :

- `manuel/TEST-restauration-bac-a-sable.md` — restaurer une sauvegarde
  dans un projet Supabase jetable, et vérifier que rien ne manque. Le
  seul essai qui ait jamais trouvé cinq défauts d'un coup.
- `manuel/TEST-v1.24.md` — le tour des caisses partagées, des
  doublons de projet et des quatre états.

Un essai de restauration vaut d'être refait **après chaque migration
qui touche à une table**, et au moins une fois par trimestre.
