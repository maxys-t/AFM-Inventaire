/* Harnais v2.2.1 — l'application parle anglais.

   Le français est la langue dans laquelle ce code est pensé et
   commenté ; l'anglais est celle que l'application parle. Les deux
   cohabitent dans les mêmes fichiers, et c'est précisément pour ça
   que des libellés français passent régulièrement entre les mailles :
   « Identité », « Rangement », « Faire partir » sont restés visibles
   des mois après le passage à l'anglais, parce qu'ils se lisaient
   comme des commentaires.

   Ce harnais ne relit donc pas les commentaires : il ne regarde que
   ce qui finit SOUS LES YEUX de quelqu'un — un texte entre deux
   balises, un libellé de `kv()`, un `placeholder`, un `title`. */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

/* Les mots qui ont réellement été oubliés, plus ceux que la prochaine
   fonction risque d'amener. Liste à compléter plutôt qu'à deviner :
   une liste trop large finirait par crier au loup sur un nom propre. */
const MOTS = ['État','Poids','Où','Sorties','Identité','Historique','Rangement',
  'Achat','Fabricant','Modèle','Propriétaire','Fournisseur','Prix','Commande',
  'Caisse','Conditionnement','Faire partir','Le parc','Ajouter','Annuler',
  'Enregistrer','Fermer','Supprimer','Rangé','Actuellement','non pesé',
  'Aucun','Aucune','aucun élément','Chargement','Rechercher','Retour'];

const fichiers = ['index.html'].concat(
  fs.readdirSync(path.join(SRC, 'js'))
    .filter(f => f.startsWith('views-')).map(f => 'js/' + f));

const trouvés = [];
fichiers.forEach(f => {
  const s = read(f);
  /* Le texte d'un nœud : entre « > » et « < », sans accolade — une
     accolade signalerait une interpolation, donc du code. */
  [...s.matchAll(/>([^<>{}\n]{1,80})</g)].forEach(m => {
    MOTS.forEach(w => { if(m[1].includes(w)) trouvés.push(f + ' → ' + m[1].trim()); });
  });
  /* Et ce qui s'affiche sans passer par une balise. */
  [...s.matchAll(/\b(?:kv|placeholder|title)\(?['"=]\s*['"]?([^'"]{1,60})['"]/g)].forEach(m => {
    MOTS.forEach(w => { if(m[1].includes(w)) trouvés.push(f + ' → ' + m[1]); });
  });
});

const R = [];
const T = (c, l) => R.push([!!c, l]);
const S = l => R.push([null, l]);

S('1. Aucun libellé français ne reste à l’écran');
T(trouvés.length === 0,
  trouvés.length ? trouvés.length + ' reste(s) : ' + [...new Set(trouvés)].slice(0,6).join(' | ')
                 : 'les vues et l’index sont entièrement en anglais');

S('2. Les commentaires, eux, restent en français');
/* Ce harnais ne doit pas pousser à traduire la documentation interne.
   Elle est écrite pour la personne qui maintient l'outil, et la
   traduire perdrait les nuances qui justifient chaque décision. */
const inv = read('js/views-inventory.js');
T(/\/\* =+\n\s+[A-ZÉÈÀÙÇ]/.test(inv) || /\/\*[\s\S]{0,200}(parce que|c'est|qui)/.test(inv),
  'les blocs d’explication sont intacts — on ne traduit pas le raisonnement');

S('3. Les libellés de la fiche sont bien ceux attendus');
['Identity','Storage','History','Purchase'].forEach(c =>
  T(inv.includes('<h4>' + c), `la carte « ${c} » porte son nom anglais`));
['Brand','Model','Serial number','Owner','Home','Currently','Pack','Case','Supplier']
  .forEach(k => T(inv.includes(`kv('${k}'`), `${k} aussi`));
T(/class="k">Condition</.test(inv) && /class="k">Weight</.test(inv)
  && /class="k">Where</.test(inv) && /class="k">Check-outs</.test(inv),
  'et les quatre chiffres du bandeau');

S('4. Le rail');
const html = read('index.html');
T(/railhead">Send out</.test(html) && /railhead">The fleet</.test(html),
  'ses deux intitulés de groupe sont en anglais');

let fails = 0;
for(const [ok, l] of R){
  if(ok === null) console.log('\n' + l);
  else { if(!ok) fails++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + l); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
