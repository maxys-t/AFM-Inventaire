# Protocole de test — v2.8 (alias, garantie, champs par domaine, IT)

Dix minutes. Rien de destructeur.

## Avant

1. Exporte une sauvegarde depuis **Settings → Backup**.
2. Passe `sql/035-alias-garantie-champs.sql` dans un **onglet neuf**.
   Les trois colonnes de contrôle doivent dire **ok**, et
   `migrations_enregistrees` passer à **35**.
3. Pousse, recharge, vérifie **v2.8.0** en haut à gauche.

---

## 1. L'alias

- Inventory → ouvre un de tes Mac Studio → **Edit** → nouveau champ
  **Alias**, tape `AccessFlow A`. Enregistre.
- **Attendu** : dans la liste, la ligne affiche désormais
  « **AccessFlow A** · Apple Mac Studio M2 Max 2023 96 Gb » — le nom
  d'usage en gras, le modèle en retrait.
- Fais pareil sur le second, `AccessFlow B`.
- **Attendu, et c'est le point** : tu ne vois plus « #1 » et « #2 ».
  Personne ne dit « le Mac Studio numéro 1 ».
- Tape `accessflow a` dans la recherche.
- **Attendu** : la machine sort. L'alias est cherché en premier.

> Ce champ n'a rien d'informatique : essaie-le sur deux Pelicases,
> « la bleue » et « la grise ».

## 2. La garantie

- Sur la même machine, **Edit** → **Warranty until** → mets une date
  dans deux mois. Enregistre.
- **Attendu** : le tableau de bord, dans *Needs attention*, affiche
  « warranty ends in 60 days ».
- Mets une date passée sur une autre.
- **Attendu** : « warranty ended » avec la date.
- Inventory → menu d'une colonne → affiche **Warranty**.
- **Attendu** : la colonne se trie, et les échéances proches ou
  passées sont marquées.

## 3. Les champs machine

- Ouvre un Mac Studio → colonne de droite, nouvelle carte
  **Machine** → **Edit**.
- Remplis : *Role* `Mixing`, *OS version* `macOS 14.5`, coche
  **Updates frozen**, *Frozen because* `Antelope driver not ready`,
  *Chip* `M2 Max`, *RAM* `96`, *Hostname* `accessflow-a`,
  *FileVault* `On`.
- **Attendu** sur la fiche : la carte liste ce qui est rempli, et le
  gel apparaît comme une étiquette avec sa raison à côté.
- Ouvre un **micro**.
- **Attendu** : aucune carte *Machine*. Elle n'apparaît que si la
  sous-catégorie en déclare.
- Cherche `accessflow-a` dans l'inventaire.
- **Attendu** : la machine sort — les champs de domaine sont
  cherchables.

> Tu remarqueras qu'il n'y a **ni stockage libre, ni santé de
> batterie, ni date de dernière sauvegarde**. C'est délibéré : ça
> dérive en permanence, personne ne le saisirait, et un champ périmé
> a l'air d'une réponse. Exactement ce qui est arrivé à tes quarante
> XLR numérotés.

## 4. L'onglet IT — le test qui compte

- Rail → **IT**.
- **Attendu** : tes ordinateurs, sous leur nom d'usage, avec les
  colonnes que tu viens de remplir. Les machines non renseignées sont
  là aussi, et un compteur dit combien restent à remplir.
- **Attendu** : les colonnes que personne n'a remplies ne s'affichent
  pas. Remplis *MAC address* sur une machine, reviens : la colonne
  apparaît.

Puis la vérification qui prouve qu'on n'a pas créé un second tableur :

- Inventory → **+ Add item** → crée un ordinateur quelconque,
  sous-catégorie **Computer**.
- Va dans **IT** sans rien faire d'autre.
- **Attendu** : il y est déjà. Tu n'as créé aucune ligne de suivi —
  elle existe parce que la machine existe.
- Mets-le à la corbeille.
- **Attendu** : il disparaît de IT. Rien à nettoyer.

## 5. La sauvegarde

- Settings → **Export backup**, ouvre le `.json`, cherche `alias` et
  `extra`.
- **Attendu** : tes valeurs y sont.

---

## Si quelque chose cloche

Dis-moi **à quelle étape** et **ce que tu as vu**. Le numéro d'étape
suffit à retrouver le code concerné.
